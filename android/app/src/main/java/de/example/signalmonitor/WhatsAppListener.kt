package de.example.signalmonitor

import android.app.Notification
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

class WhatsAppListener : NotificationListenerService() {
 private val handler=Handler(Looper.getMainLooper())
 private val executor=Executors.newSingleThreadExecutor()
 private var connected=false
 @Volatile private var busy=false
 private val prefs by lazy {getSharedPreferences("signal",MODE_PRIVATE)}
 override fun onListenerConnected(){connected=true;handler.removeCallbacks(tick);handler.post(tick)}
 override fun onListenerDisconnected(){connected=false;handler.removeCallbacks(tick)}
 override fun onNotificationPosted(sbn:StatusBarNotification){if(sbn.packageName=="com.whatsapp")schedule()}
 override fun onNotificationRemoved(sbn:StatusBarNotification){if(sbn.packageName=="com.whatsapp")schedule()}
 private fun schedule(){handler.removeCallbacks(tick);handler.postDelayed(tick,400)}
 private val tick=object:Runnable{override fun run(){if(!connected)return;sendSnapshot();handler.postDelayed(this,15000)}}
 private fun sendSnapshot(){
  if(busy||prefs.getString("device","")!="xcover6")return
  val u=prefs.getString("url","")!!.trimEnd('/')
  val token=prefs.getString("token","")!!
  val host=try{URL(u)}catch(e:Exception){return}
  val octets=host.host.split('.').mapNotNull{it.toIntOrNull()}
  if(host.protocol!="http"||host.port!=8787||host.userInfo!=null||octets.size!=4||octets[0]!=100||octets[1] !in 64..127||octets.any{it !in 0..255}||token.isBlank())return
  val enabled=prefs.getBoolean("wa_enabled",false)
  val all=try{activeNotifications.orEmpty().filter{it.packageName=="com.whatsapp" && (it.notification.flags and Notification.FLAG_GROUP_SUMMARY)==0}.sortedByDescending{it.postTime}}catch(e:Exception){return}
  val messages=all.filter{it.notification.category==Notification.CATEGORY_MESSAGE}
  val call=all.firstOrNull{it.notification.category==Notification.CATEGORY_CALL}
  val latest=messages.firstOrNull()
  fun text(n:Notification?,key:String,max:Int)=n?.extras?.getCharSequence(key)?.toString()?.take(max)?:""
  val style=latest?.let{Notification.MessagingStyle.extractMessagingStyleFromNotification(it.notification)}
  val last=style?.messages?.lastOrNull()
  val sender=(last?.senderPerson?.name?.toString()?:text(latest?.notification,Notification.EXTRA_TITLE,120)).take(120)
  val preview=(last?.text?.toString()?:text(latest?.notification,Notification.EXTRA_TEXT,500)).take(500)
  val count=messages.sumOf { Notification.MessagingStyle.extractMessagingStyleFromNotification(it.notification)?.messages?.size?.coerceAtLeast(1)?:1 }.coerceAtMost(9999)
  val body=JSONObject().put("enabled",enabled).put("count",if(enabled)count else 0).put("chats",if(enabled)messages.size.coerceAtMost(9999) else 0)
   .put("sender",if(enabled)sender else "").put("text",if(enabled)preview else "").put("caller",if(enabled)text(call?.notification,Notification.EXTRA_TITLE,120) else "")
  busy=true
  executor.execute{
   var c:HttpURLConnection?=null
   try{
    c=(URL("$u/v1/whatsapp").openConnection() as HttpURLConnection).apply{requestMethod="POST";connectTimeout=4000;readTimeout=4000;instanceFollowRedirects=false;doOutput=true;setRequestProperty("Authorization","Bearer $token");setRequestProperty("X-Device-Id","xcover6");setRequestProperty("Content-Type","application/json; charset=utf-8")}
    c.outputStream.use{it.write(body.toString().toByteArray(Charsets.UTF_8))};c.responseCode
   }catch(e:Exception){/* No sensitive notification text in logs. Retried by heartbeat. */}
   finally{c?.disconnect();busy=false}
  }
 }
 override fun onDestroy(){connected=false;handler.removeCallbacks(tick);executor.shutdownNow();super.onDestroy()}
}
