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
import io.ktor.websocket.send
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlin.time.Clock
import kotlin.time.Instant

fun main(): Unit {

    val RouteChangeEvent = jacksonObjectMapper()
        .writeValueAsString(mapOf("target" to "routes", "event" to "change"))

    val eventbus = MutableSharedFlow<String>()

    val repository = object : Repository<DynRoute> {
        private val _routes: MutableMap<String, DynRoute> = mutableMapOf()
        override suspend fun store(vararg routes: DynRoute) {
            for (route in routes) {
                val existing = _routes[route.name];
                if (existing == null) _routes[route.name] = route;
                else  _routes[route.name] = existing.concat(route);
            }
        }
        override suspend fun list() = _routes.values.toList()
        override suspend fun delete(name: String) = _routes.remove(name) as Unit
    }


    println("Server starting on http://localhost:8080")
    val server = embeddedServer(Netty, 8080, "0.0.0.0") {
        install(LoggerPlugin)
        install(CorsPlugin)
        install(WebSockets)
        install(RoutingRoot) {
            webSocket("/events") {
                eventbus.collect {
                    println(it)
                    send(it)
                }
            }
            endpoints("/api/{key}", {
                call.response.header(HttpHeaders.ContentType, "application/json")
                val key = call.parameters["key"]!!
                return@endpoints when (key) {
                    "route.list" -> {
                        val routes = repository.list().let { jacksonObjectMapper().writeValueAsString(it) }
                        call.respond(HttpStatusCode.OK, routes)
                    }
                    "route.store" -> {
                        val route = DynRoute.fromJSON(call.receiveText()) ?: return@endpoints call.respond(HttpStatusCode.BadRequest)
                        repository.store(route)
                        eventbus.emit(RouteChangeEvent)
                        call.respond(HttpStatusCode.NoContent)
                    }
                    "route.delete" -> {
                        eventbus.emit(RouteChangeEvent)
                        call.respond(HttpStatusCode.NoContent)
                    }
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

interface Repository<T> {
    suspend fun store(vararg items: T): Unit
    suspend fun list(): List<T>
    suspend fun delete(id: String): Unit
}

interface ToJSON<T> {
    fun toJSON(element: T): String
}
interface FromJSON<T> {
    fun fromJSON(json: String): T?
}

data class DynRoute(
    val name: String,
    val path: String,
    val component: String,
    val props: Map<String, Any?> = emptyMap(),
    val data: Map<String, Any?> = emptyMap()) {
    fun concat(route: DynRoute): DynRoute {
        return copy(path = route.path, component = route.component, props = route.props, data = route.data)
    }

    companion object : FromJSON<DynRoute>, ToJSON<DynRoute> {
        override fun toJSON(route: DynRoute): String {
            val mapper = jacksonObjectMapper()
            return mapper.writeValueAsString(route)
        }

        override fun fromJSON(json: String): DynRoute? {
            val mapper = jacksonObjectMapper()
            return mapper.readValue(json, DynRoute::class.java)
        }
    }
}


