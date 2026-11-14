plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android { namespace="de.example.signalmonitor"; compileSdk=35
 defaultConfig { applicationId="de.example.signalmonitor"; minSdk=31; targetSdk=35; versionCode=1; versionName="0.1" }
 compileOptions { sourceCompatibility=JavaVersion.VERSION_17; targetCompatibility=JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget="17" }
}
