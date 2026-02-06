
version = "0.0.1"
group = "org.picoapp.backend"
plugins {
    alias(libs.plugins.kotlin)
    application
}

repositories.mavenCentral()
repositories.gradlePluginPortal()

application.mainClass = "$group.MainKt"
kotlin { }
sourceSets {
    main {
        kotlin.srcDirs("src")
        resources.srcDirs("resources")
    }
}

dependencies {
    implementation(libs.coroutine)
    implementation(libs.datetime)
    implementation(libs.json)
    implementation(libs.jackson)
    implementation(libs.ktorCore)
    implementation(libs.ktorNetty)
    implementation(libs.ktorWS)
    implementation(libs.ktorSSE)
    implementation(libs.ktorContentNegociation)
    implementation(libs.ktorSerializationJson)

}