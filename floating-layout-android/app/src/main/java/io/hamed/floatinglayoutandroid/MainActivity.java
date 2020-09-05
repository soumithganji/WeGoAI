package io.hamed.floatinglayoutandroid;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.AppCompatImageView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationManager;
import android.app.admin.DevicePolicyManager;
import android.bluetooth.BluetoothAdapter;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.hardware.Camera;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PersistableBundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;
import android.view.MotionEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import java.util.Objects;

import io.hamed.floatinglayout.callback.FloatingCallBack;
import io.hamed.floatinglayout.FloatingLayout;

import static android.graphics.Color.WHITE;
import static android.graphics.Color.blue;
import static io.hamed.floatinglayoutandroid.R.drawable.your_rounded_shape;

public class MainActivity extends AppCompatActivity {
    private DevicePolicyManager mgr=null;
    private ComponentName cn=null;
    private CameraManager objCameraManager;
    private String mCameraId;
    private View ivOnOFF;
    private MediaPlayer objMediaPlayer;
    private Boolean isTorchOn;
    private FloatingLayout floatingLayout;
    private BluetoothAdapter BA;
    int c,o,b,r,s=1,w;
    Switch sw;
    private NotificationManager mNotificationManager;
    TextView reset;
    View blutoothbutton;

    private FloatingCallBack floatingCallBack = new FloatingCallBack() {
        @Override
        public void onCreateListener(final View view) {

           final View btn= view.findViewById(R.id.emoji2);
            final  View big = view.findViewById(R.id.vector_mid);
            final View small=view.findViewById(R.id.emoji_mid);
            btn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    View btn2=view.findViewById(R.id.vector_2);
                    View btn3=view.findViewById(R.id.vector_3);
                    View btn4=view.findViewById(R.id.vector_4);
                    View btn5=view.findViewById(R.id.vector_5);
                    View btn6=view.findViewById(R.id.vector_6);
                    View btn7=view.findViewById(R.id.vector_7);
                    View btn8=view.findViewById(R.id.vector_8);
                    View btn9=view.findViewById(R.id.vector_9);
                    View reverse=view.findViewById(R.id.reverse);
                    View a= view.findViewById(R.id.vector_1);
//                    View b= view.findViewById(R.id.emoji2);

                    FrameLayout framelayout=view.findViewById(R.id.root_container);

                            btn2.setVisibility(View.VISIBLE);
                            Animation slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_up);
                            btn2.startAnimation(slideUp);
                            btn3.setVisibility(View.VISIBLE);
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_down);
                            btn3.startAnimation(slideUp);
                            btn4.setVisibility(View.VISIBLE);
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_right);
                            btn4.startAnimation(slideUp);
                            btn5.setVisibility(View.VISIBLE);
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_left);
                            btn5.startAnimation(slideUp);
                            btn6.setVisibility(View.VISIBLE);
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.top_right);
                            btn6.startAnimation(slideUp);
                            btn7.setVisibility(View.VISIBLE);
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.bottom_right);
                            btn7.startAnimation(slideUp);
                            btn8.setVisibility(View.VISIBLE);
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.bottom_left);
                            btn8.startAnimation(slideUp);
                            btn9.setVisibility(View.VISIBLE);
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.top_left);
                            btn9.startAnimation(slideUp);
                            reverse.setVisibility(View.VISIBLE);
                            framelayout.setLayoutParams(new FrameLayout.LayoutParams(280,310));
                            framelayout.setBackgroundResource(your_rounded_shape);
                            a.setVisibility(View.INVISIBLE);
                            btn.setVisibility(View.INVISIBLE);
                            big.setVisibility(View.VISIBLE);
                            small.setVisibility(View.VISIBLE);

                }

            });

            small.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    View btn = view.findViewById(R.id.emoji2);
                    View btn2 = view.findViewById(R.id.vector_2);
                    View btn3 = view.findViewById(R.id.vector_3);
                    View btn4 = view.findViewById(R.id.vector_4);
                    View btn5 = view.findViewById(R.id.vector_5);
                    View btn6 = view.findViewById(R.id.vector_6);
                    View btn7 = view.findViewById(R.id.vector_7);
                    View btn8 = view.findViewById(R.id.vector_8);
                    View btn9 = view.findViewById(R.id.vector_9);
                    View reverse = view.findViewById(R.id.reverse);
                    FrameLayout framelayout = view.findViewById(R.id.root_container);

                    btn2.setVisibility(View.INVISIBLE);
                    btn3.setVisibility(View.INVISIBLE);
                    btn4.setVisibility(View.INVISIBLE);
                    btn5.setVisibility(View.INVISIBLE);
                    btn6.setVisibility(View.INVISIBLE);
                    btn7.setVisibility(View.INVISIBLE);
                    btn8.setVisibility(View.INVISIBLE);
                    btn9.setVisibility(View.INVISIBLE);
                    reverse.setVisibility(View.INVISIBLE);
                    framelayout.setBackgroundResource(0);
                    framelayout.setLayoutParams(new FrameLayout.LayoutParams(100, 100));
                    btn.setVisibility(View.VISIBLE);
                    View a= view.findViewById(R.id.vector_1);
                    a.setVisibility(View.VISIBLE);
                    btn.setVisibility(View.VISIBLE);
                }


            });
            final View button1=view.findViewById(R.id.vector_2);
            button1.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if(s==1) {
                        try {
                            AudioManager am;
                            am = (AudioManager) getBaseContext().getSystemService(Context.AUDIO_SERVICE);
                            if (am.getRingerMode() == AudioManager.RINGER_MODE_SILENT) {
                                am.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
                                button1.setBackgroundResource(R.drawable.ic_mic);
                                mNotificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                                changeInterruptionFiler(NotificationManager.INTERRUPTION_FILTER_ALL);
                            } else {
                                am.setRingerMode(AudioManager.RINGER_MODE_SILENT);
                                button1.setBackgroundResource(R.drawable.ic_mute);
                            }
                        }
                        catch (Exception e){

                        }
                    }
                    else if(s==2){
                        openApp(MainActivity.this, "com.netflix.mediaclient");
                    }
                }
            });
            final View button2=view.findViewById(R.id.vector_3);
            button2.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (mgr.isAdminActive(cn)) {
                        mgr.lockNow();
                    }
                    else {
                        Intent intent=
                                new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
                        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, cn);
                        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                                getString(R.string.device_admin_explanation));
                        startActivity(intent);
                    }

                }
            });
            final View button4=view.findViewById(R.id.vector_4);
            button4.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    try {
                        if (isTorchOn) {
                            turnOffLight();
                            isTorchOn = false;
                            button4.setBackgroundResource(R.drawable.ic_bulb_on);
                        } else {
                            turnOnLight();
                            isTorchOn = true;
                            button4.setBackgroundResource(R.drawable.ic_bulb_off);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
            final View button5=view.findViewById(R.id.vector_5);
            button5.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    BA = BluetoothAdapter.getDefaultAdapter();
                    if(!BA.isEnabled()) {
                        Intent turnOn = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
                        startActivityForResult(turnOn, 0);
                        button5.setBackgroundResource(R.drawable.ic_bluetooth_1);


                    }
                    else if(BA.isEnabled()){
                        BA.disable();
                        button5.setBackgroundResource(R.drawable.ic_bluetooth_off);
                    }

                }

            });

            View button6=view.findViewById(R.id.vector_6);
            button6.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (s == 1) {
                        openApp(MainActivity.this, "com.sec.android.app.camera");
                    }
                    else if(s==2){
                        openApp(MainActivity.this, "com.google.android.youtube");

                    }
                }

            });

            final View button7=view.findViewById(R.id.vector_7);
            button7.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if(s==1) {
                        openApp(MainActivity.this, "com.arthurivanets.reminder");
                    }
                    else if(s==2){
                        button7.setBackgroundResource(R.drawable.ic_close_red);
                        floatingLayout.close();
                        sw.setVisibility(View.VISIBLE);
                        reset =findViewById(R.id.reset);
                        reset.setVisibility(View.VISIBLE);

                    }
                }
            });

            View button8=view.findViewById(R.id.vector_8);
            button8.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    openApp(MainActivity.this, "com.android.chrome");
               }
            });

            final View button9=view.findViewById(R.id.vector_9);
            button9.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if(s==1) {
                        openApp(MainActivity.this, "com.bsbportal.music");

                    }
                    else if(s==2){
                        openApp(MainActivity.this, "com.amazon.avod.thirdpartyclient");
                    }
                }
            }
            );



            final View reverse=view.findViewById(R.id.reverse);
            reverse.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    View btn2 = view.findViewById(R.id.vector_2);
                    View btn3 = view.findViewById(R.id.vector_3);
                    View btn4 = view.findViewById(R.id.vector_4);
                    View btn5 = view.findViewById(R.id.vector_5);
                    View btn6 = view.findViewById(R.id.vector_6);
                    View btn7 = view.findViewById(R.id.vector_7);
                    View btn8 = view.findViewById(R.id.vector_8);
                    View btn9 = view.findViewById(R.id.vector_9);
                    btn2.setBackgroundResource(your_rounded_shape);
                    int x = r % 2;
                    switch (x) {
                        case 0:
                            reverse.setBackgroundResource(R.drawable.ic_back);
                            btn2.setBackgroundResource(R.drawable.ic_netflix);
                            Animation slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_left);
                            btn2.startAnimation(slideUp);
                            btn9.setBackgroundResource(R.drawable.ic_amazon);
                            btn9.startAnimation(slideUp);
                            btn3.setBackgroundResource(0);
                            btn4.setBackgroundResource(0);
                            btn5.setBackgroundResource(0);
                            btn6.setBackgroundResource(R.drawable.ic_youtube);
                            btn6.startAnimation(slideUp);
                            btn7.setBackgroundResource(R.drawable.ic_close);
                            btn7.startAnimation(slideUp);
                            btn8.setBackgroundResource(0);
                            s=2;
                            r++;
                            break;
                        case 1:
                            reverse.setBackgroundResource(R.drawable.ic_next_right);
                            AudioManager am;
                            am= (AudioManager) getBaseContext().getSystemService(Context.AUDIO_SERVICE);
                            if(am.getRingerMode()==AudioManager.RINGER_MODE_SILENT){
                                btn2.setBackgroundResource(R.drawable.ic_mute);
                            }
                            else {
                                btn2.setBackgroundResource(R.drawable.ic_mic);
                            }
                            slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_right);
                            btn2.startAnimation(slideUp);
                            btn9.setBackgroundResource(R.drawable.ic_music);
                            btn9.startAnimation(slideUp);
                            btn3.setBackgroundResource(R.drawable.ic_password);
                            btn3.startAnimation(slideUp);
                            if(isTorchOn){
                                btn4.setBackgroundResource(R.drawable.ic_bulb_off);
                            }
                            else{
                                btn4.setBackgroundResource(R.drawable.ic_bulb_on);
                            }
                            btn4.startAnimation(slideUp);
                            BA = BluetoothAdapter.getDefaultAdapter();
                            if(BA.isEnabled()) {
                                btn5.setBackgroundResource(R.drawable.ic_bluetooth_1);
                            }
                            else{
                                btn5.setBackgroundResource(R.drawable.ic_bluetooth_off);
                            }
                            btn5.startAnimation(slideUp);
                            btn6.setBackgroundResource(R.drawable.ic_camera);
                            btn6.startAnimation(slideUp);
                            btn7.setBackgroundResource(R.drawable.ic_reminder);
                            btn7.startAnimation(slideUp);
                            btn8.setBackgroundResource(R.drawable.ic_chrome);
                            btn8.startAnimation(slideUp);
                            r++;
                            s=1;
                            break;

                    }
                }
            });
        }

        @Override
        public void onCloseListener() {
//            Toast.makeText(getApplicationContext(), "Close", Toast.LENGTH_SHORT).show();
        }
    };



    public static boolean openApp(Context context, String packageName) {
        PackageManager manager = context.getPackageManager();
        try {
            Intent i = manager.getLaunchIntentForPackage(packageName);
            if (i == null) {
                return false;

            }
            i.addCategory(Intent.CATEGORY_LAUNCHER);
            context.startActivity(i);
            return true;
        } catch (ActivityNotFoundException e) {
            return false;
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.LOLLIPOP)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        cn=new ComponentName(this, AdminReceiver.class);
        mgr=(DevicePolicyManager)getSystemService(DEVICE_POLICY_SERVICE);


//        startService(new Intent(getApplicationContext(),MyService.class));

        blutoothbutton =findViewById(R.id.vector_5);

        //appear on top permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            Intent mSettingsIntent = mSettingsIntent = new Intent(Intent.ACTION_MAIN)
                    .setAction(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            try {
                startActivity(mSettingsIntent);
            } catch (Exception ex) {
                Log.w("ErrorLog", "Unable to launch app draw overlay settings " + mSettingsIntent, ex);
            }
        }

        //dot not disturb permission
        mNotificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        changeInterruptionFiler(NotificationManager.INTERRUPTION_FILTER_ALL);


        sw = (Switch) findViewById(R.id.switch1);
        sw.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                if (isChecked&&w==0) {
                    showFloating();
                    startService(new Intent(MainActivity.this,MyService.class));
                    sw.setVisibility(View.INVISIBLE);
                    sw.setChecked(false);
                } else {
                    floatingLayout.close();
                }

            }

        });
        TextView t=findViewById(R.id.reset);
        t.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                sw.setVisibility(View.VISIBLE);
                sw.setChecked(false);

            }
        });
        //flash

        ivOnOFF = (View) findViewById(R.id.vector_4);
        isTorchOn = false;
/**
 * Check if device contains flashlight
 *
 * if not then exit from screen
 *
 */
        Boolean isFlashAvailable = getApplicationContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH);
        if (!isFlashAvailable) {
            AlertDialog alert = new AlertDialog.Builder(MainActivity.this).create();
            alert.setTitle(getString(R.string.app_name));
            alert.setMessage(getString(R.string.msg_error));
            alert.setButton(DialogInterface.BUTTON_POSITIVE, getString(R.string.lbl_ok), new DialogInterface.OnClickListener() {
                public void onClick(DialogInterface dialog, int which) {
                    finish();
                }
            });
            alert.show();
            return;
        }
        objCameraManager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
        try {
            mCameraId = objCameraManager.getCameraIdList()[0];
        } catch (CameraAccessException e) {
            e.printStackTrace();
        }


    }

//    @Override
//    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
//        super.onActivityResult(requestCode, resultCode, data);
//
//        if (requestCode == 0) {
//            if(resultCode == Activity.RESULT_OK){
//
//            }
//            if (resultCode == Activity.RESULT_CANCELED) {
//                //Write your code if there's no result
//            }
//        }
//    }

//    private void setonbluetoooth() {
//        blutoothbutton.setBackgroundResource(R.drawable.ic_bluetooth_1);
//    }

    private void showFloating() {
        floatingLayout = new FloatingLayout(this, R.layout.sample_layout, floatingCallBack);
        floatingLayout.create();

    }

    /**
     * Method for turning light ON
     */
    public void turnOnLight() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                objCameraManager.setTorchMode(mCameraId, true);
                playOnOffSound();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Method for turning light OFF
     */
    public void turnOffLight() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                objCameraManager.setTorchMode(mCameraId, false);
                playOnOffSound();
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    private void playOnOffSound() {
        objMediaPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
            @Override
            public void onCompletion(MediaPlayer mp) {
                mp.release();
            }
        });
        objMediaPlayer.start();
    }
    @Override
    protected void onStop() {
        super.onStop();
        if (isTorchOn) {
            turnOffLight();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (isTorchOn) {
            turnOnLight();
        }

        SharedPreferences sh
                = getSharedPreferences("MySharedPref",
                MODE_APPEND);


        boolean b = sh.getBoolean("b", false);
        int visibility=sh.getInt("visibility",0);

        sw.setTag("TAG");
        sw.setChecked(b);
        sw.setVisibility(visibility);
        reset=findViewById(R.id.reset);
    }
    @Override
    protected void onPause() {
        super.onPause();
        if (isTorchOn) {
            turnOffLight();
        }


        SharedPreferences sharedPreferences
                = getSharedPreferences("MySharedPref",
                MODE_PRIVATE);
        SharedPreferences.Editor myEdit
                = sharedPreferences.edit();
        myEdit.putBoolean("b",
                sw.isChecked());
        myEdit.putInt("visibility",sw.getVisibility());

        myEdit.commit();
    }

    protected void changeInterruptionFiler(int interruptionFilter){
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.M){ // If api level minimum 23

            if(mNotificationManager.isNotificationPolicyAccessGranted()){

                mNotificationManager.setInterruptionFilter(interruptionFilter);
            }else {

                Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                startActivity(intent);
            }
        }
    }
}