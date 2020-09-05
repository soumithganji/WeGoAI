package io.hamed.floatinglayoutandroid;

import android.app.job.JobInfo;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.os.Build;
import android.os.Handler;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.RequiresApi;

import static android.content.Context.JOB_SCHEDULER_SERVICE;

public class Restarter extends BroadcastReceiver {
    public static final String TAG = Restarter.class.getSimpleName();
    private static JobScheduler jobScheduler;
    private Restarter restartSensorServiceReceiver;

    /**
     * it returns the number of version code
     *
     * @param context
     * @return
     */
    public static long getVersionCode(Context context) {
        PackageInfo pInfo;
        try {
            pInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            long versionCode = System.currentTimeMillis();  //PackageInfoCompat.getLongVersionCode(pInfo);
            return versionCode;

        } catch (Exception e) {
            Log.e(TAG, e.getMessage());
        }
        return 0;
    }

    @Override
    public void onReceive(Context context, Intent intent) {

    }
}
