plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val releaseStoreFile = providers.gradleProperty("SITPAY_RELEASE_STORE_FILE")
    .orElse(providers.environmentVariable("SITPAY_RELEASE_STORE_FILE"))
    .orNull
val releaseStorePassword = providers.gradleProperty("SITPAY_RELEASE_STORE_PASSWORD")
    .orElse(providers.environmentVariable("SITPAY_RELEASE_STORE_PASSWORD"))
    .orNull
val releaseKeyAlias = providers.gradleProperty("SITPAY_RELEASE_KEY_ALIAS")
    .orElse(providers.environmentVariable("SITPAY_RELEASE_KEY_ALIAS"))
    .orNull
val releaseKeyPassword = providers.gradleProperty("SITPAY_RELEASE_KEY_PASSWORD")
    .orElse(providers.environmentVariable("SITPAY_RELEASE_KEY_PASSWORD"))
    .orNull
val releaseSigningValues = listOf(
    releaseStoreFile,
    releaseStorePassword,
    releaseKeyAlias,
    releaseKeyPassword,
)
val releaseBuildRequested = gradle.startParameter.taskNames.any {
    it.contains("release", ignoreCase = true)
}

if (releaseBuildRequested && releaseSigningValues.any { it.isNullOrBlank() }) {
    throw GradleException(
        "Configure SITPAY_RELEASE_STORE_FILE, SITPAY_RELEASE_STORE_PASSWORD, " +
            "SITPAY_RELEASE_KEY_ALIAS, and SITPAY_RELEASE_KEY_PASSWORD to sign release builds."
    )
}
if (releaseBuildRequested && releaseStoreFile?.let { file(it).isFile } != true) {
    throw GradleException("The configured SITPAY release keystore file does not exist.")
}

android {
    namespace = "com.example.sit_pay_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.example.sit_pay_mobile"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // Uses the version code from pubspec.yaml. When using split APKs, 1000 * ABI_VERSION
        // is added automatically by Flutter. (https://developer.android.com/studio/build/configure-apk-splits#configure-APK-versions)
        // You can force using the value of versionCode by specifying the `-P force-version-code-ignoring-abi=true`
        // flag during build.
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        create("release") {
            if (releaseSigningValues.all { !it.isNullOrBlank() }) {
                storeFile = file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            isShrinkResources = false
            signingConfig = signingConfigs.getByName("release")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
