package de.example.signalmonitor

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telephony.*
import android.widget.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class MainActivity : Activity() {
 private val handler=Handler(Looper.getMainLooper())
 private val executor=Executors.newSingleThreadExecutor()
 private lateinit var tm:TelephonyManager
 private lateinit var status:TextView
 private lateinit var url:EditText
 private lateinit var token:EditText
 private lateinit var device:Spinner
 private var callback:TelephonyCallback?=null
 @Volatile private var measurement:Pair<Int,String>?=null
 private var monitoring=false
 private val prefs by lazy { getSharedPreferences("signal",MODE_PRIVATE) }
 override fun onCreate(savedInstanceState:Bundle?) {
  super.onCreate(savedInstanceState)
  tm=getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager
  val view=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(30,36,30,20)}
  view.addView(TextView(this).apply{text="Samsung Signal Monitor – Windows-PC";textSize=21f})
  view.addView(TextView(this).apply{text="PC-Adresse im Tailscale-Netz (http://100.x.y.z:8787)"})
  url=EditText(this).apply{setSingleLine(true);setText(prefs.getString("url",""));hint="http://100.x.y.z:8787"};view.addView(url)
  device=Spinner(this);device.adapter=ArrayAdapter(this,android.R.layout.simple_spinner_dropdown_item,listOf("fold7","xcover6"));device.setSelection(if(prefs.getString("device","fold7")=="xcover6") 1 else 0);view.addView(device)
  view.addView(TextView(this).apply{text="Geräteschlüssel (aus EINRICHTUNG-GEHEIM.txt)"})
  token=EditText(this).apply{setSingleLine(true);inputType=129;setText(prefs.getString("token",""))};view.addView(token)
  view.addView(Button(this).apply{text="Speichern und verbinden";setOnClickListener{save();register()}})
  status=TextView(this).apply{setPadding(0,28,0,0);textSize=17f;text="App geöffnet lassen; Tailscale auf EIN stellen."};view.addView(status)
  setContentView(ScrollView(this).apply{addView(view)})
  if(checkSelfPermission(Manifest.permission.READ_PHONE_STATE)!=PackageManager.PERMISSION_GRANTED)requestPermissions(arrayOf(Manifest.permission.READ_PHONE_STATE),11)
  else register()
 }
 private fun save(){prefs.edit().putString("url",url.text.toString().trim()).putString("device",device.selectedItem.toString()).putString("token",token.text.toString().trim()).apply()}
 override fun onRequestPermissionsResult(code:Int,p:Array<out String>,r:IntArray){super.onRequestPermissionsResult(code,p,r);if(code==11 && r.firstOrNull()==PackageManager.PERMISSION_GRANTED)register() else status.text="Telefonberechtigung fehlt"}
 private fun register(){
  if(checkSelfPermission(Manifest.permission.READ_PHONE_STATE)!=PackageManager.PERMISSION_GRANTED)return
  if(monitoring)return
  monitoring=true
  val cb=object:TelephonyCallback(),TelephonyCallback.SignalStrengthsListener,TelephonyCallback.DisplayInfoListener {
   override fun onSignalStrengthsChanged(s:SignalStrength){
    val cell=s.cellSignalStrengths.filter{it.dbm in -160..-20}.minByOrNull{when(it){is CellSignalStrengthNr->0;is CellSignalStrengthLte->1;is CellSignalStrengthWcdma->2;is CellSignalStrengthGsm->3;else->4}}
    measurement=cell?.let{it.dbm to when(it){is CellSignalStrengthNr->"5G";is CellSignalStrengthLte->"4G";is CellSignalStrengthWcdma->"3G";is CellSignalStrengthGsm->"2G";else->"UNKNOWN"}}
    updateStatus()
   }
   override fun onDisplayInfoChanged(info:TelephonyDisplayInfo){
    val is5g=info.networkType==TelephonyManager.NETWORK_TYPE_NR||info.overrideNetworkType==TelephonyDisplayInfo.OVERRIDE_NETWORK_TYPE_NR_NSA||info.overrideNetworkType==TelephonyDisplayInfo.OVERRIDE_NETWORK_TYPE_NR_ADVANCED
    if(is5g)measurement=measurement?.let{it.first to "5G"}
   }
  }
  callback=cb
  try{tm.registerTelephonyCallback(mainExecutor,cb)}catch(e:Exception){status.text="Messung fehlgeschlagen: ${e.message}";monitoring=false;return}
  handler.post(tick)
 }
 private fun updateStatus(){status.text=measurement?.let{"${it.second} / ${it.first} dBm\nÜbertragung solange App sichtbar bleibt"}?:"Kein Messwert vorhanden"}
 private val tick=object:Runnable {override fun run(){
  if(!monitoring)return
  val value=measurement;val u=prefs.getString("url","")!!.trimEnd('/');val t=prefs.getString("token","")!!;val id=prefs.getString("device","fold7")!!
  if(value!=null&&Regex("^http://100\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}:8787$").matches(u)&&t.isNotBlank())executor.execute{post(u,t,id,value)}
  handler.postDelayed(this,10000)
 }}
 private fun post(u:String,t:String,id:String,v:Pair<Int,String>){
  var conn:HttpURLConnection?=null
  try{
   conn=(URL("$u/v1/signal").openConnection() as HttpURLConnection).apply{requestMethod="POST";connectTimeout=5000;readTimeout=5000;doOutput=true;setRequestProperty("Authorization","Bearer $t");setRequestProperty("X-Device-Id",id);setRequestProperty("Content-Type","application/json")}
   conn.outputStream.use{it.write(JSONObject().put("dbm",v.first).put("network",v.second).toString().toByteArray())}
   val code=conn.responseCode;if(code !in 200..299)runOnUiThread{status.text="Server HTTP $code – Token prüfen"}
  }catch(e:Exception){runOnUiThread{status.text="Keine Verbindung zum Windows-PC – Tailscale prüfen"}}
  finally{conn?.disconnect()}
 }
 override fun onStop(){super.onStop();stop()}
 override fun onStart(){super.onStart();if(::tm.isInitialized&&!monitoring&&checkSelfPermission(Manifest.permission.READ_PHONE_STATE)==PackageManager.PERMISSION_GRANTED)register()}
 private fun stop(){monitoring=false;handler.removeCallbacks(tick);callback?.let{tm.unregisterTelephonyCallback(it)};callback=null}
 override fun onDestroy(){stop();executor.shutdownNow();super.onDestroy()}
}
