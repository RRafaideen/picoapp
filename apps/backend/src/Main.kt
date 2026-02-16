package org.picoapp.backend

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.createRouteScopedPlugin
import io.ktor.server.application.hooks.CallSetup
import io.ktor.server.application.hooks.ResponseSent
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.request.header
import io.ktor.server.request.httpMethod
import io.ktor.server.request.receiveText
import io.ktor.server.request.uri
import io.ktor.server.response.header
import io.ktor.server.response.respond
import io.ktor.server.routing.Route
import io.ktor.server.routing.RoutingContext
import io.ktor.server.routing.RoutingRoot
import io.ktor.server.routing.route
import io.ktor.server.websocket.WebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.websocket.WebSocketSession
import io.ktor.websocket.send
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import java.awt.Dialog
import kotlin.time.Clock
import kotlin.time.Instant

fun main(): Unit {

    val eventbus = MutableSharedFlow<Event>()
    val navigations = mutableMapOf<String, Navigation>()
    val modals = mutableMapOf<String, Modal>()

    val navigation = Navigation("default", routes = listOf(
        NavFragment("first", "/", component = "route:default:page-1"),
        NavFragment("second", "/second", component = "route:default:page-2"),
        NavFragment("third", "/third", component = "route:default:page-3"),
        ))
    navigations.set("default", navigation)

    val modal = Modal("modal:next-version", mapOf("title" to "A new version is here", "content" to "Do you want to get it ?"))
    modals.set("modal:next-version", modal)

    println("Server starting on http://localhost:8080")
    val server = embeddedServer(Netty, 8080, "0.0.0.0") {
        install(LoggerPlugin)
        install(CorsPlugin)
        install(WebSockets)
        install(RoutingRoot) {
            webSocket("/events") { handleEvents(eventbus) }
            endpoints("/api/{key}", {
                call.response.header(HttpHeaders.ContentType, "application/json")
                val key = call.parameters["key"]!!
                return@endpoints when (key) {
                    "navigation.get"   -> navigationGet(navigations)
                    "navigation.store" -> navigationStore(eventbus, navigations)
                    "modal.get"        -> modalGet(modals)
                    "modal.store"      -> modalStore(modals)
                    else -> call.respond(HttpStatusCode.NotFound)
                }
            })
        }
    }
    server.start(wait = true)
}


/* --- Internal --- */

// Ktor
val CorsPlugin = createRouteScopedPlugin("cors") {
    onCall { call ->
        call.response.header("Access-Control-Allow-Origin", "*")
        call.response.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE")
        call.response.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        call.response.header("Access-Control-Allow-Credentials","true")
        if(call.request.httpMethod == HttpMethod.Options) return@onCall call.respond(HttpStatusCode.OK)
    }
}
val LoggerPlugin = createRouteScopedPlugin("logger") {
    var start: Instant? = null
    on(CallSetup) { start = Clock.System.now() }
    on(ResponseSent) { call ->
        val time = Clock.System.now().epochSeconds - start!!.epochSeconds;
        val method = call.request.httpMethod.value;
        val path = call.request.uri;
        val status = call.response.status()?.value ?: 404
        println("[$method][$status] $path ${time}s")
    }
}

fun Route.endpoints(path: String, build: suspend RoutingContext.() -> Unit) =
    route(path) {
        handle {
            val length = call.request.header(HttpHeaders.ContentType)
            val type = call.request.header(HttpHeaders.ContentType) ?: ""
            if(length != null && !Regex("^application/json").matches(type))
                return@handle call.respond(HttpStatusCode.NotAcceptable)
            build()
        }
    }

sealed class Event(val target: String) {
    class NavigationChange(val key: String): Event("navigation-change")
}
suspend fun WebSocketSession.handleEvents(eventbus: SharedFlow<Event>) {
    eventbus.collect({
        val mapper = jacksonObjectMapper()
        val json = mapper.writeValueAsString(it)
        send(json)
    })
}

data class Navigation(val key: String, val routes: List<NavFragment> = emptyList())
data class NavFragment(val name: String, val path: String, val component: String)
suspend fun RoutingContext.navigationGet(navigations: Map<String, Navigation>) {
    val key = call.queryParameters["navigation"] ?: return call.respond(HttpStatusCode.BadRequest)
    val navigation = navigations[key] ?: return call.respond(HttpStatusCode.NotFound)
    // navigation = navigation.copy(routes = navigation.routes.sortedWith { a, b -> if(a.position > b.position) 1 else -1 })
    val data = jacksonObjectMapper().writeValueAsString(navigation)
    call.respond(HttpStatusCode.OK, data)
}
suspend fun RoutingContext.navigationStore(bus: MutableSharedFlow<Event>, navigations: MutableMap<String, Navigation>) {
    val data = jacksonObjectMapper().readValue(call.receiveText(), Navigation::class.java)
    navigations.set(data.key, data).also { bus.emit(Event.NavigationChange(data.key)) }
    call.respond(HttpStatusCode.NoContent)
}

data class Modal(val name: String, val props: Map<String, Any> = emptyMap())
suspend fun RoutingContext.modalGet(modals: Map<String, Modal>) {
    val key = call.queryParameters["name"] ?: return call.respond(HttpStatusCode.BadRequest)
    val dialog = modals[key] ?: return call.respond(HttpStatusCode.NotFound)
    val data = jacksonObjectMapper().writeValueAsString(dialog)
    call.respond(HttpStatusCode.OK, data)
}
suspend fun RoutingContext.modalStore(modals: MutableMap<String, Modal>) {
    val data = jacksonObjectMapper().readValue(call.receiveText(), Modal::class.java)
    modals.set(data.name, data)
    call.respond(HttpStatusCode.NoContent)
}