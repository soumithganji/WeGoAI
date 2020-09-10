package io.hamed.floatinglayoutandroid;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.admin.DevicePolicyManager;
import android.bluetooth.BluetoothAdapter;
import android.content.ActivityNotFoundException;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraManager;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.widget.CompoundButton;
import android.widget.FrameLayout;
import android.widget.Switch;
import android.widget.TextView;
import android.widget.Toast;

import io.hamed.floatinglayout.callback.FloatingCallBack;
import io.hamed.floatinglayout.FloatingLayout;

import static io.hamed.floatinglayoutandroid.R.drawable.your_rounded_shape;

public class MainActivity extends AppCompatActivity {
    private DevicePolicyManager mgr = null;
    private ComponentName cn = null;
    private CameraManager objCameraManager;
    private String mCameraId;
    private MediaPlayer objMediaPlayer;
    private Boolean isTorchOn;
    private FloatingLayout floatingLayout;
    private BluetoothAdapter BA;
    private int r = 0, s = 1, w,c=0;
    private Switch sw;
    private NotificationManager mNotificationManager;
    private TextView reset;
    private FloatingCallBack floatingCallBack = new FloatingCallBack() {
        @Override
        public void onCreateListener(final View view) {
            final View btn2 = view.findViewById(R.id.vector_2);
            final View btn3 = view.findViewById(R.id.vector_3);
            final View btn4 = view.findViewById(R.id.vector_4);
            final View btn5 = view.findViewById(R.id.vector_5);
            final View btn6 = view.findViewById(R.id.vector_6);
            final View btn7 = view.findViewById(R.id.vector_7);
            final View btn8 = view.findViewById(R.id.vector_8);
            final View btn9 = view.findViewById(R.id.vector_9);
            final View btn10 = view.findViewById(R.id.vector_10);
            final View btn11 = view.findViewById(R.id.vector_11);
            final FrameLayout btn12 = view.findViewById(R.id.vector_12);
            final View btn13 = view.findViewById(R.id.vector_13);
            final View btn14 = view.findViewById(R.id.vector_14);
            final View btn15 = view.findViewById(R.id.vector_15);
            final View btn16 = view.findViewById(R.id.vector_16);
            final View btn17 = view.findViewById(R.id.vector_17);
            final View btn18 = view.findViewById(R.id.vector_18);
            final View btn19 = view.findViewById(R.id.vector_19);





            final View reverse = view.findViewById(R.id.reverse);
            final View a = view.findViewById(R.id.vector_1);
            final View btn = view.findViewById(R.id.emoji2);
            final View big = view.findViewById(R.id.vector_mid);
            final View small = view.findViewById(R.id.emoji_mid);
            final FrameLayout framelayout = view.findViewById(R.id.root_container);

            //btn: without frame
            btn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    btn10.setVisibility(View.VISIBLE);
                    btn11.setVisibility(View.VISIBLE);
                    btn13.setVisibility(View.VISIBLE);
                    btn14.setVisibility(View.VISIBLE);
                    btn15.setVisibility(View.VISIBLE);
                    btn17.setVisibility(View.VISIBLE);



                    ViewGroup.MarginLayoutParams params = (ViewGroup.MarginLayoutParams) btn10.getLayoutParams();
                    params.setMargins(125, 323, 1, 4);
                    btn10.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn11.getLayoutParams();
                    params.setMargins(205, 323, 1, 4);
                    btn11.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn13.getLayoutParams();
                    params.setMargins(120, 423, 1, 4);
                    btn13.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn14.getLayoutParams();
                    params.setMargins(195, 423, 1, 4);
                    btn14.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn15.getLayoutParams();
                    params.setMargins(25, 423, 1, 4);
                    btn15.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn17.getLayoutParams();
                    params.setMargins(210, 532, 1, 4);
                    btn17.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn18.getLayoutParams();
                    params.setMargins(110, 528, 1, 4);
                    btn18.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn19.getLayoutParams();
                    params.setMargins(20, 528, 1, 4);
                    btn19.setLayoutParams(params);

                    framelayout.setLayoutParams(new FrameLayout.LayoutParams(280, 310));
                    framelayout.setBackgroundResource(your_rounded_shape);

                    btn12.setLayoutParams(new FrameLayout.LayoutParams(280, 110));
                    btn12.setBackgroundResource(your_rounded_shape);

                    params = (ViewGroup.MarginLayoutParams) btn12.getLayoutParams();
                    params.setMargins(0, 400, 0, 0);
                    btn12.setLayoutParams(params);

                    btn16.setLayoutParams(new FrameLayout.LayoutParams(80, 80));
                    btn16.setBackgroundResource(your_rounded_shape);

                    params = (ViewGroup.MarginLayoutParams) btn16.getLayoutParams();
                    params.setMargins(195, 520, 0, 0);
                    btn16.setLayoutParams(params);

                    if (s == 1) {
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
                        a.setVisibility(View.INVISIBLE);
                        btn.setVisibility(View.INVISIBLE);
                        big.setVisibility(View.VISIBLE);
                        small.setVisibility(View.VISIBLE);
                    } else if (s == 2) {
                        btn2.setVisibility(View.VISIBLE);
                        Animation slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_up);
                        btn2.startAnimation(slideUp);
                        btn6.setVisibility(View.VISIBLE);
                        slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.top_right);
                        btn6.startAnimation(slideUp);
                        btn7.setVisibility(View.VISIBLE);
                        slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.bottom_right);
                        btn7.startAnimation(slideUp);
                        btn9.setVisibility(View.VISIBLE);
                        slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.top_left);
                        btn9.startAnimation(slideUp);
                        reverse.setVisibility(View.VISIBLE);
                        a.setVisibility(View.INVISIBLE);
                        btn.setVisibility(View.INVISIBLE);
                        big.setVisibility(View.VISIBLE);
                        small.setVisibility(View.VISIBLE);
                        btn3.setVisibility(View.INVISIBLE);
                        btn4.setVisibility(View.INVISIBLE);
                        btn5.setVisibility(View.INVISIBLE);
                        btn8.setVisibility(View.INVISIBLE);
                    }
                }
            });

            //small:with frame
            small.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    btn2.setVisibility(View.INVISIBLE);
                    btn3.setVisibility(View.INVISIBLE);
                    btn4.setVisibility(View.INVISIBLE);
                    btn5.setVisibility(View.INVISIBLE);
                    btn6.setVisibility(View.INVISIBLE);
                    btn7.setVisibility(View.INVISIBLE);
                    btn8.setVisibility(View.INVISIBLE);
                    btn9.setVisibility(View.INVISIBLE);
                    btn10.setVisibility(View.INVISIBLE);
                    btn11.setVisibility(View.INVISIBLE);
                    btn13.setVisibility(View.INVISIBLE);
                    btn14.setVisibility(View.INVISIBLE);
                    btn15.setVisibility(View.INVISIBLE);
                    btn17.setVisibility(View.INVISIBLE);
                    btn18.setVisibility(View.INVISIBLE);
                    btn19.setVisibility(View.INVISIBLE);


                    btn.setVisibility(View.VISIBLE);
                    a.setVisibility(View.VISIBLE);
                    btn.setVisibility(View.VISIBLE);
                    reverse.setVisibility(View.INVISIBLE);


                    ViewGroup.MarginLayoutParams params = (ViewGroup.MarginLayoutParams) btn10.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn10.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn11.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn11.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn13.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn13.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn14.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn14.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn15.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn15.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn17.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn17.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn18.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn18.setLayoutParams(params);

                    params = (ViewGroup.MarginLayoutParams) btn19.getLayoutParams();
                    params.setMargins(1, 1, 1, 1);
                    btn19.setLayoutParams(params);

                    framelayout.setBackgroundResource(0);
                    framelayout.setLayoutParams(new FrameLayout.LayoutParams(100, 100));

                    btn12.setLayoutParams(new FrameLayout.LayoutParams(100, 100));
                    btn12.setBackgroundResource(0);
                    params = (ViewGroup.MarginLayoutParams) btn12.getLayoutParams();
                    params.setMargins(0, 0, 0, 0);
                    btn12.setLayoutParams(params);

                    btn16.setLayoutParams(new FrameLayout.LayoutParams(100, 100));
                    btn16.setBackgroundResource(0);
                    params = (ViewGroup.MarginLayoutParams) btn16.getLayoutParams();
                    params.setMargins(0, 0, 0, 0);
                    btn16.setLayoutParams(params);
                }
            });

            btn2.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (s == 1) {
                        try {
                            AudioManager am;
                            am = (AudioManager) getBaseContext().getSystemService(Context.AUDIO_SERVICE);
                            if (am.getRingerMode() == AudioManager.RINGER_MODE_SILENT) {
                                am.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
                                btn2.setBackgroundResource(R.drawable.ic_mic);
                                mNotificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                                changeInterruptionFiler(NotificationManager.INTERRUPTION_FILTER_ALL);
                            } else {
                                am.setRingerMode(AudioManager.RINGER_MODE_SILENT);
                                btn2.setBackgroundResource(R.drawable.ic_mute);
                            }
                        } catch (Exception e) {
                        }
                    } else if (s == 2) {
                        openApp(MainActivity.this, "com.netflix.mediaclient");
                    }
                }
            });

            btn3.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    try {
                        if (mgr.isAdminActive(cn)) {
                            mgr.lockNow();
                        } else {
                            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
                            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, cn);
                            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, getString(R.string.device_admin_explanation));
                            startActivity(intent);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });

            btn4.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    try {
                        if (isTorchOn) {
                            turnOffLight();
                            isTorchOn = false;
                            btn4.setBackgroundResource(R.drawable.ic_bulb_on);
                        } else {
                            turnOnLight();
                            isTorchOn = true;
                            btn4.setBackgroundResource(R.drawable.ic_bulb_off);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });

            btn5.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    BA = BluetoothAdapter.getDefaultAdapter();
                    if (!BA.isEnabled()) {
                        Intent turnOn = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
                        startActivityForResult(turnOn, 0);
                        btn5.setBackgroundResource(R.drawable.ic_bluetooth_1);
                    } else if (BA.isEnabled()) {
                        BA.disable();
                        btn5.setBackgroundResource(R.drawable.ic_bluetooth_off);
                    }
                }

            });

            btn6.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (s == 1) {
                        openApp(MainActivity.this, "com.sec.android.app.camera");
                    } else if (s == 2) {
                        openApp(MainActivity.this, "com.google.android.youtube");
                    }
                }

            });

            btn7.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (s == 1) {
                        openApp(MainActivity.this, "com.arthurivanets.reminder");
                    } else if (s == 2) {
                        btn7.setBackgroundResource(R.drawable.ic_close_red);
                        floatingLayout.close();
                        sw.setVisibility(View.VISIBLE);
                        reset = findViewById(R.id.reset);
                        reset.setVisibility(View.VISIBLE);
                    }
                }
            });

            btn8.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    openApp(MainActivity.this, "com.android.chrome");
                }
            });

            btn9.setOnClickListener(new View.OnClickListener() {
                                        @Override
                                        public void onClick(View v) {
                                            if (s == 1) {
                                                openApp(MainActivity.this, "com.bsbportal.music");

                                            } else if (s == 2) {
                                                openApp(MainActivity.this, "com.amazon.avod.thirdpartyclient");
                                            }
                                        }
                                    }
            );

            btn10.setOnClickListener(new View.OnClickListener() {
                                         long eventtime = SystemClock.uptimeMillis();

                                         @Override
                                         public void onClick(View v) {
                                             startActivity(new Intent(Settings.ACTION_WIFI_SETTINGS));
                                         }
                                     }
            );

            btn11.setOnClickListener(new View.OnClickListener() {
                                         @Override
                                         public void onClick(View v) {
                                             Intent intent = new Intent(Intent.ACTION_MAIN);
                                             intent.setComponent(new ComponentName("com.android.settings", "com.android.settings.Settings$DataUsageSummaryActivity"));
                                             startActivity(intent);
                                         }
                                     }
            );

            btn13.setOnClickListener(new View.OnClickListener() {
                                         @RequiresApi(api = Build.VERSION_CODES.Q)
                                         @Override
                                         public void onClick(View v) {
                                             AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                                             if (am.isMusicActive()) {
                                                 KeyEvent downEvent = new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);
                                                 am.dispatchMediaKeyEvent(downEvent);
                                                 KeyEvent upEvent = new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);
                                                 am.dispatchMediaKeyEvent(upEvent);
                                                 btn13.setBackgroundResource(R.drawable.ic_play_button);
                                                 ViewGroup.MarginLayoutParams params;
                                                 params = (ViewGroup.MarginLayoutParams) btn13.getLayoutParams();
                                                 params.setMargins(120, 423, 1, 4);
                                                 btn13.setLayoutParams(params);
                                             } else if (am.isMusicActive() == false) {
                                                 KeyEvent downEvent = new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);
                                                 am.dispatchMediaKeyEvent(downEvent);
                                                 KeyEvent upEvent = new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE);
                                                 am.dispatchMediaKeyEvent(upEvent);
                                                 btn13.setBackgroundResource(R.drawable.ic_pause);
                                                 ViewGroup.MarginLayoutParams params;
                                                 params = (ViewGroup.MarginLayoutParams) btn13.getLayoutParams();
                                                 params.setMargins(113, 423, 1, 4);
                                                 btn13.setLayoutParams(params);
                                             }
                                         }
                                     }
            );

            btn14.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    long eventtime = SystemClock.uptimeMillis();
                    Intent downIntent = new Intent(Intent.ACTION_MEDIA_BUTTON, null);
                    KeyEvent downEvent = new KeyEvent(eventtime, eventtime, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_NEXT, 0);
                    downIntent.putExtra(Intent.EXTRA_KEY_EVENT, downEvent);
                    sendOrderedBroadcast(downIntent, null);
//                    try {
//                        Intent i = new Intent(Intent.ACTION_CALL);
//                        String p = "tel:" + "7093701910";
//                        i.setData(Uri.parse(p));
//                        startActivity(i);
//                    } catch (Exception e) {
//                        e.printStackTrace();
//                        Intent myAppSettings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
//                        myAppSettings.addCategory(Intent.CATEGORY_DEFAULT);
//                        myAppSettings.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//                        startActivity(myAppSettings);
//                        Toast.makeText(getApplicationContext(),"Please grant telephone permissions",Toast.LENGTH_SHORT).show();
//                    }
                }
            }
            );

            btn15.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    long eventtime = SystemClock.uptimeMillis();
                    Intent downIntent = new Intent(Intent.ACTION_MEDIA_BUTTON, null);
                    KeyEvent downEvent = new KeyEvent(eventtime, eventtime, KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_MEDIA_PREVIOUS, 0);
                    downIntent.putExtra(Intent.EXTRA_KEY_EVENT, downEvent);
                    sendOrderedBroadcast(downIntent, null);
                }
            }
            );

            btn17.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                     int x=c%2;
                     switch (x){
                         case 0:
                             btn18.setVisibility(View.VISIBLE);
                             Animation slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_right_m);
                             btn18.startAnimation(slideUp);

                             btn19.setVisibility(View.VISIBLE);
                             slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_right_p);
                             btn19.startAnimation(slideUp);

                             c++;
                             break;
                         case 1:
                             btn18.setVisibility(View.INVISIBLE);
                             slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_left_m);
                             btn18.startAnimation(slideUp);

                             btn19.setVisibility(View.INVISIBLE);
                             slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_left_p);
                             btn19.startAnimation(slideUp);
                             c++;
                             break;
                     }
                }
            }
            );

            btn18.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    try {
                        Intent i = new Intent(Intent.ACTION_CALL);
                        String p = "tel:" + "7093701910";
                        i.setData(Uri.parse(p));
                        startActivity(i);
                    } catch (Exception e) {
                        e.printStackTrace();
                        Intent myAppSettings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
                        myAppSettings.addCategory(Intent.CATEGORY_DEFAULT);
                        myAppSettings.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(myAppSettings);
                        Toast.makeText(getApplicationContext(),"Please grant telephone permissions",Toast.LENGTH_SHORT).show();
                    }
                }
            }
            );

            btn19.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    try {
                        Intent i = new Intent(Intent.ACTION_CALL);
                        String p = "tel:" + "8179030022";
                        i.setData(Uri.parse(p));
                        startActivity(i);
                    } catch (Exception e) {
                        e.printStackTrace();
                        Intent myAppSettings = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()));
                        myAppSettings.addCategory(Intent.CATEGORY_DEFAULT);
                        myAppSettings.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(myAppSettings);
                        Toast.makeText(getApplicationContext(),"Please grant telephone permissions",Toast.LENGTH_SHORT).show();
                    }
                }
            }
            );

            reverse.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    int x = r % 2;
                    switch (x) {
                        case 0:
                            reverse.setBackgroundResource(R.drawable.ic_back);
                            btn2.setBackgroundResource(R.drawable.ic_netflix);
                            Animation slideUp = AnimationUtils.loadAnimation(MainActivity.this, R.anim.slide_left);
                            btn2.startAnimation(slideUp);
                            btn9.setBackgroundResource(R.drawable.ic_amazon);
                            btn9.startAnimation(slideUp);
                            btn3.setVisibility(View.INVISIBLE);
                            btn4.setVisibility(View.INVISIBLE);
                            btn5.setVisibility(View.INVISIBLE);
                            btn6.setBackgroundResource(R.drawable.ic_youtube);
                            btn6.startAnimation(slideUp);
                            btn7.setBackgroundResource(R.drawable.ic_close);
                            btn7.startAnimation(slideUp);
                            btn8.setVisibility(View.INVISIBLE);
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
                            btn3.setVisibility(View.VISIBLE);
                            btn3.setBackgroundResource(R.drawable.ic_password);
                            btn3.startAnimation(slideUp);
                            btn4.setVisibility(View.VISIBLE);
                            if(isTorchOn){
                                btn4.setBackgroundResource(R.drawable.ic_bulb_off);
                            }
                            else{
                                btn4.setBackgroundResource(R.drawable.ic_bulb_on);
                            }
                            btn4.startAnimation(slideUp);
                            BA = BluetoothAdapter.getDefaultAdapter();
                            btn5.setVisibility(View.VISIBLE);
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
                            btn8.setVisibility(View.VISIBLE);
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

        View blutoothbutton = findViewById(R.id.vector_5);

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

        //call permissions


        //device admin app
        TextView admin=findViewById(R.id.deviceadminapp);
        admin.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                startActivity(new Intent().setComponent(new ComponentName("com.android.settings", "com.android.settings.DeviceAdminSettings")));
            }
        });

        //notif
        sw = (Switch) findViewById(R.id.switch1);
        sw.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                if (isChecked&&w==0) {
                    showFloating();
                    startService(new Intent(MainActivity.this,MyService.class));
                    sw.setVisibility(View.INVISIBLE);
                    sw.setChecked(false);
                }
                else {
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
        View ivOnOFF = (View) findViewById(R.id.vector_4);
        isTorchOn = false;

/**Check if device contains flashlight
 if not then exit from screen
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

    private void showFloating() {
        floatingLayout = new FloatingLayout(this, R.layout.sample_layout, floatingCallBack);
        floatingLayout.create();
    }

    /*** Method for turning light ON*/
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

    /*** Method for turning light OFF*/
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

    public void createNotification(View view) {
        // Prepare intent which is triggered if the
        // notification is selected
        Intent intent = new Intent(this, NotificationReceiverActivity.class);
        PendingIntent pIntent = PendingIntent.getActivity(this, (int) System.currentTimeMillis(), intent, 0);

        // Build notification
        // Actions are just fake
        Notification noti = new Notification.Builder(this)
                .setContentTitle("New mail from " + "test@gmail.com")
                .setContentText("Subject").setSmallIcon(R.drawable.ic_emoji)
                .setContentIntent(pIntent)
                .addAction(R.drawable.ic_emoji, "Call", pIntent)
                .addAction(R.drawable.ic_emoji, "More", pIntent)
                .addAction(R.drawable.ic_emoji, "And more", pIntent).build();
        NotificationManager notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        // hide the notification after its selected
        noti.flags |= Notification.FLAG_AUTO_CANCEL;
        notificationManager.notify(0, noti);
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
        @SuppressLint("WrongConstant") SharedPreferences sh = getSharedPreferences("MySharedPref", MODE_APPEND);
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
        SharedPreferences sharedPreferences = getSharedPreferences("MySharedPref", MODE_PRIVATE);
        SharedPreferences.Editor myEdit = sharedPreferences.edit();
        myEdit.putBoolean("b", sw.isChecked());
        myEdit.putInt("visibility",sw.getVisibility());

        myEdit.commit();
    }

    protected void changeInterruptionFiler(int interruptionFilter){
        if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.M){ // If api level minimum 23
            if(mNotificationManager.isNotificationPolicyAccessGranted()){
                mNotificationManager.setInterruptionFilter(interruptionFilter);
            }
            else {
                Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                startActivity(intent);
            }
        }
    }
}