    package io.hamed.floatinglayoutandroid;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.Nullable;

import java.util.Timer;
import java.util.TimerTask;

    public class MyService extends Service {
        public int counter=0;
        public MyService() {
        }
        @Override
        public int onStartCommand(Intent intent, int flags, int startId){
            onTaskRemoved(intent);
//            startTimer();
            return START_STICKY;
        }
        @Override
        public IBinder onBind(Intent intent) {
            // TODO: Return the communication channel to the service.
            throw new UnsupportedOperationException("Not yet implemented");
        }
        @Override
        public void onTaskRemoved(Intent rootIntent) {
            Intent restartServiceIntent = new Intent(getApplicationContext(),this.getClass());
            restartServiceIntent.setPackage(getPackageName());
            startService(restartServiceIntent);
            super.onTaskRemoved(rootIntent);
        }
        @Override
        public void onDestroy() {
            super.onDestroy();
            Intent broadcastIntent = new Intent(this,Restarter.class);
//            broadcastIntent.setAction("restartservice");
//            broadcastIntent.setClass(this, Restarter.class);
            sendBroadcast(broadcastIntent);
//            stoptimertask();
        }
        private Timer timer;
        private TimerTask timerTask;
        long oldTime=0;
        public void startTimer() {
            //set a new Timer
            timer = new Timer();

            //initialize the TimerTask's job
            initializeTimerTask();

            //schedule the timer, to wake up every 1 second
            timer.schedule(timerTask, 1000, 1000); //
        }

        /**
         * it sets the timer to print the counter every x seconds
         */
        public void initializeTimerTask() {
            timerTask = new TimerTask() {
                public void run() {
                    Log.i("in timer", "in timer ++++  "+ (counter++));
                }
            };
        }
        public void stoptimertask() {
            //stop the timer, if it's not already null
            if (timer != null) {
                timer.cancel();
                timer = null;
            }
        }


    }