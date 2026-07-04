// AppNavigator.js — All screens + navigation for CampusRelay
import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList, KeyboardAvoidingView,
  Platform, Alert, RefreshControl, TextInput, Modal, Image
} from 'react-native';
import { NavigationContainer }        from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { SafeAreaProvider }           from 'react-native-safe-area-context';
import { LinearGradient }             from 'expo-linear-gradient';
import * as ImagePicker               from 'expo-image-picker';
import * as Location                  from 'expo-location';
import * as WebBrowser                from 'expo-web-browser';
import Toast                          from 'react-native-toast-message';
import { formatDistanceToNow, format } from 'date-fns';

import {
  Button, Input, Card, HeroHeader, ScreenHeader, Avatar, Chip,
  Stars, LiveDot, Divider, SectionLabel, EmptyState, LoadingScreen,
  OtpInput, SimpleMap, Toggle
} from '../components/common/UI';
import { FeedCard, HistoryCard } from '../components/delivery/DeliveryCard';
import useAuthStore     from '../store/authStore';
import useDeliveryStore from '../store/deliveryStore';
import { authAPI, deliveryAPI, walletAPI, ratingsAPI, chatAPI, adminAPI, usersAPI } from '../services/api';
import { on, off, joinDeliveryRoom, leaveDeliveryRoom, goCarrierOnline, goCarrierOffline, sendLocation, emitTyping, emitStopTyping } from '../services/socket';
import { COLORS, DELIVERY_APPS, MIN_COMMISSION, PLATFORM_CUT, RATING_TAGS, DELIVERY_STATUS } from '../constants';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ navigation }) {
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const login = useAuthStore(s => s.login);
  const handle = async () => {
    if (!phone || !password) return Toast.show({ type:'error', text1:'Fill in all fields' });
    setLoading(true);
    try { await login(phone, password); }
    catch (e) { Toast.show({ type:'error', text1:'Login failed', text2:e.message }); }
    finally { setLoading(false); }
  };
  return (
    <KeyboardAvoidingView style={{flex:1,backgroundColor:COLORS.brandDark}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView contentContainerStyle={{flexGrow:1,padding:24}} keyboardShouldPersistTaps="handled">
        <View style={{alignItems:'center',paddingTop:60,paddingBottom:32}}>
          <View style={{width:88,height:88,borderRadius:26,backgroundColor:COLORS.brand,alignItems:'center',justifyContent:'center',marginBottom:16}}>
            <Text style={{fontSize:44}}>📦</Text>
          </View>
          <Text style={{fontSize:38,fontWeight:'800',color:'#fff',letterSpacing:-1}}>
            Campus<Text style={{color:COLORS.brand}}>Relay</Text>
          </Text>
          <Text style={{color:'rgba(255,255,255,0.45)',fontSize:14,marginTop:6}}>Your campus, delivered.</Text>
        </View>
        <View style={{backgroundColor:'#fff',borderRadius:28,padding:22}}>
          <Text style={{fontSize:22,fontWeight:'800',color:COLORS.text}}>Welcome Back 👋</Text>
          <Text style={{fontSize:13,color:COLORS.muted,marginTop:4}}>Sign in to continue</Text>
          <Input label="Phone Number" placeholder="10-digit mobile" value={phone}
            onChangeText={setPhone} keyboardType="phone-pad" icon="📱" style={{marginTop:18}}/>
          <Input label="Password" placeholder="••••••••" value={password}
            onChangeText={setPassword} secureTextEntry icon="🔒"/>
          <Button label="Sign In" onPress={handle} loading={loading} style={{marginTop:6}}/>
          <View style={{flexDirection:'row',alignItems:'center',marginVertical:16,gap:10}}>
            <View style={{flex:1,height:1,backgroundColor:COLORS.border}}/>
            <Text style={{color:COLORS.muted,fontSize:12}}>or</Text>
            <View style={{flex:1,height:1,backgroundColor:COLORS.border}}/>
          </View>
          <TouchableOpacity onPress={()=>navigation.navigate('Register')} style={{alignItems:'center'}}>
            <Text style={{color:COLORS.muted,fontSize:13}}>
              New here? <Text style={{color:COLORS.brand,fontWeight:'700'}}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </View>
        {__DEV__&&<Text style={{color:'rgba(255,255,255,0.3)',textAlign:'center',fontSize:11,marginTop:16}}>
          Dev: 9111111111/Test@123 (Receiver) · 9222222222/Test@123 (Carrier)
        </Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── REGISTER ─────────────────────────────────────────────────────────────────
function RegisterScreen({ navigation }) {
  const [step,setStep]=useState(1);
  const [roles,setRoles]=useState(['receiver']);
  const [f,setFv]=useState({fullName:'',phone:'',password:'',confirm:'',branch:'',year:'',hostelBlock:'',roomNumber:'',upiId:''});
  const [loading,setLoading]=useState(false);
  const register=useAuthStore(s=>s.register);
  const s=(k,v)=>setFv(p=>({...p,[k]:v}));
  const toggleRole=r=>setRoles(p=>p.includes(r)?(p.length>1?p.filter(x=>x!==r):p):[...p,r]);
  const step1OK=()=>{
    if(!f.fullName||!f.phone||!f.password) return Toast.show({type:'error',text1:'Fill all fields'});
    if(f.password!==f.confirm) return Toast.show({type:'error',text1:'Passwords do not match'});
    if(f.phone.length<10) return Toast.show({type:'error',text1:'Invalid phone number'});
    setStep(2);
  };
  const submit=async()=>{
    setLoading(true);
    try {
      await register({fullName:f.fullName,phone:f.phone,password:f.password,roles,upiId:f.upiId,
        college:{branch:f.branch,year:parseInt(f.year)||1,hostelBlock:f.hostelBlock,roomNumber:f.roomNumber,isDayScholar:roles.includes('carrier')}});
      navigation.navigate('KYC');
    } catch(e){Toast.show({type:'error',text1:'Failed',text2:e.message});}
    finally{setLoading(false);}
  };
  return (
    <KeyboardAvoidingView style={{flex:1,backgroundColor:COLORS.brandDark}} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView contentContainerStyle={{flexGrow:1,padding:24}} keyboardShouldPersistTaps="handled">
        <View style={{paddingTop:20,paddingBottom:24}}>
          <TouchableOpacity onPress={()=>step>1?setStep(p=>p-1):navigation.goBack()}>
            <Text style={{color:'#fff',fontSize:22}}>←</Text>
          </TouchableOpacity>
          <Text style={{color:'#fff',fontSize:22,fontWeight:'800',marginTop:8}}>Create Account</Text>
          <View style={{flexDirection:'row',gap:6,marginTop:10}}>
            {[1,2,3].map(i=><View key={i} style={{height:4,flex:1,borderRadius:4,backgroundColor:step>=i?COLORS.brand:'rgba(255,255,255,0.2)'}}/>)}
          </View>
        </View>
        <View style={{backgroundColor:'#fff',borderRadius:28,padding:22}}>
          {step===1&&<>
            <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text,marginBottom:16}}>Basic Info</Text>
            <Input label="Full Name" placeholder="As on College ID" value={f.fullName} onChangeText={v=>s('fullName',v)} autoCapitalize="words" icon="👤"/>
            <Input label="Phone Number" placeholder="10-digit mobile" value={f.phone} onChangeText={v=>s('phone',v)} keyboardType="phone-pad" icon="📱"/>
            <Input label="Password" placeholder="Min 6 characters" value={f.password} onChangeText={v=>s('password',v)} secureTextEntry icon="🔒"/>
            <Input label="Confirm Password" placeholder="Re-enter password" value={f.confirm} onChangeText={v=>s('confirm',v)} secureTextEntry icon="🔒"/>
            <Button label="Next →" onPress={step1OK}/>
          </>}
          {step===2&&<>
            <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text,marginBottom:14}}>Your Role</Text>
            {[{key:'receiver',label:'🏠 Hostel Student',desc:'Get parcels delivered to your room'},
              {key:'carrier', label:'🛵 Day Scholar',   desc:'Earn ₹30+ picking up parcels'}].map(r=>(
              <TouchableOpacity key={r.key} onPress={()=>toggleRole(r.key)}
                style={{borderWidth:1.5,borderRadius:16,padding:14,marginBottom:10,position:'relative',
                         borderColor:roles.includes(r.key)?COLORS.brand:COLORS.border,
                         backgroundColor:roles.includes(r.key)?COLORS.orangeBg:'#fff'}}>
                <Text style={{fontWeight:'700',fontSize:15,color:COLORS.text}}>{r.label}</Text>
                <Text style={{color:COLORS.muted,fontSize:12,marginTop:3}}>{r.desc}</Text>
                {roles.includes(r.key)&&<View style={{position:'absolute',top:12,right:12,width:22,height:22,borderRadius:11,
                  backgroundColor:COLORS.brand,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{color:'#fff',fontSize:12}}>✓</Text></View>}
              </TouchableOpacity>
            ))}
            <Input label="Branch & Course" placeholder="e.g. BTech CSE" value={f.branch} onChangeText={v=>s('branch',v)} autoCapitalize="words" icon="🎓" style={{marginTop:8}}/>
            <Input label="Year" placeholder="1/2/3/4" value={f.year} onChangeText={v=>s('year',v)} keyboardType="number-pad" icon="📅"/>
            {roles.includes('receiver')&&<>
              <Input label="Hostel Block" placeholder="e.g. Block C" value={f.hostelBlock} onChangeText={v=>s('hostelBlock',v)} autoCapitalize="words" icon="🏠"/>
              <Input label="Room Number" placeholder="e.g. C-204" value={f.roomNumber} onChangeText={v=>s('roomNumber',v)} autoCapitalize="characters" icon="🚪"/>
            </>}
            {roles.includes('carrier')&&<Input label="UPI ID" placeholder="yourname@upi" value={f.upiId} onChangeText={v=>s('upiId',v)} icon="💰"/>}
            <Button label="Review & Submit →" onPress={()=>setStep(3)}/>
          </>}
          {step===3&&<>
            <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text,marginBottom:14}}>Almost Done! 🎉</Text>
            <View style={{backgroundColor:COLORS.bg,borderRadius:14,padding:14,marginBottom:14}}>
              {[['Name',f.fullName],['Phone',f.phone],['Role',roles.map(r=>r.charAt(0).toUpperCase()+r.slice(1)).join(' + ')],
                ['Branch',f.branch],['Block',f.hostelBlock||'Day Scholar'],['Room',f.roomNumber||'—'],['UPI',f.upiId||'—']].map(([k,v])=>(
                <View key={k} style={{flexDirection:'row',justifyContent:'space-between',marginBottom:8}}>
                  <Text style={{color:COLORS.muted,fontSize:13}}>{k}</Text>
                  <Text style={{fontWeight:'700',fontSize:13,color:COLORS.text}}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={{backgroundColor:COLORS.greenBg,borderRadius:12,padding:12,marginBottom:14}}>
              <Text style={{color:'#065f46',fontSize:13}}>📋 Next: Upload College ID & selfie for AI verification</Text>
            </View>
            <Button label="Create Account →" onPress={submit} loading={loading}/>
            <Button label="← Edit" variant="ghost" onPress={()=>setStep(2)} style={{marginTop:8}}/>
          </>}
          <TouchableOpacity onPress={()=>navigation.navigate('Login')} style={{alignItems:'center',marginTop:14}}>
            <Text style={{color:COLORS.muted,fontSize:13}}>Already registered? <Text style={{color:COLORS.brand,fontWeight:'700'}}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── KYC ──────────────────────────────────────────────────────────────────────
function KYCScreen({ navigation }) {
  const [docs,setDocs]=useState({});
  const [loading,setLoading]=useState(false);
  const [done,setDone]=useState(false);
  const refreshUser=useAuthStore(s=>s.refreshUser);
  const pick=async(key,cam=false)=>{
    const perm=cam?await ImagePicker.requestCameraPermissionsAsync():await ImagePicker.requestMediaLibraryPermissionsAsync();
    if(!perm.granted) return Alert.alert('Permission needed');
    const r=cam?await ImagePicker.launchCameraAsync({quality:0.8}):await ImagePicker.launchImageLibraryAsync({quality:0.8,allowsEditing:true});
    if(!r.canceled) setDocs(d=>({...d,[key]:r.assets[0]}));
  };
  const submit=async()=>{
    if(!docs.collegeId||!docs.selfie) return Toast.show({type:'error',text1:'College ID and Selfie required'});
    setLoading(true);
    try {
      const form=new FormData();
      const a=(key,asset)=>form.append(key,{uri:asset.uri,name:`${key}.jpg`,type:'image/jpeg'});
      a('collegeId',docs.collegeId); a('selfie',docs.selfie);
      if(docs.aadhaar) a('aadhaar',docs.aadhaar);
      const res=await authAPI.submitKyc(form);
      Toast.show({type:'success',text1:res.faceMatchPassed?'✅ AI Verified!':'📋 Submitted',text2:'Awaiting admin approval.'});
      setDone(true); await refreshUser();
    } catch(e){Toast.show({type:'error',text1:'Upload failed',text2:e.message});}
    finally{setLoading(false);}
  };
  if(loading) return <LoadingScreen message="Uploading & running AI face match..."/>;
  if(done) return (
    <View style={{flex:1,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center',padding:32}}>
      <Text style={{fontSize:60,marginBottom:16}}>⏳</Text>
      <Text style={{fontSize:24,fontWeight:'800',textAlign:'center',color:COLORS.text}}>Verification Pending</Text>
      <Text style={{color:COLORS.muted,textAlign:'center',marginTop:10,lineHeight:22}}>
        AI checked your documents.{'\n'}Admin approves within 2–4 hours.{'\n'}You'll get notified!
      </Text>
      <Button label="Go to App" onPress={()=>navigation.replace('Main')} style={{marginTop:28,width:'100%'}}/>
    </View>
  );
  const DOCS=[
    {key:'collegeId',label:'College ID Card',emoji:'🪪',hint:'Front side clearly visible',required:true},
    {key:'aadhaar',  label:'Aadhaar Card',   emoji:'📋',hint:'Front + back (optional but recommended)',required:false},
    {key:'selfie',   label:'Live Selfie',    emoji:'🤳',hint:'AI matches this with your College ID',required:true,cam:true},
  ];
  return (
    <ScrollView style={{flex:1,backgroundColor:COLORS.bg}} contentContainerStyle={{padding:24}}>
      <Text style={{fontSize:24,fontWeight:'800',color:COLORS.text,marginBottom:6}}>Verify Identity 🔐</Text>
      <Text style={{color:COLORS.muted,fontSize:13,marginBottom:20,lineHeight:20}}>Required for campus safety. Documents encrypted & never shared.</Text>
      <View style={{backgroundColor:COLORS.blueBg,borderRadius:12,padding:12,marginBottom:20}}>
        <Text style={{color:COLORS.blue,fontSize:13}}>🤖 AI will match your selfie to your College ID in under 2 minutes.</Text>
      </View>
      {DOCS.map(d=>(
        <Card key={d.key} style={[{marginBottom:12},docs[d.key]&&{borderColor:COLORS.green,borderWidth:1.5}]}>
          <View style={{flexDirection:'row',alignItems:'center'}}>
            <View style={{width:50,height:50,borderRadius:14,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:24}}>{d.emoji}</Text>
            </View>
            <View style={{flex:1,marginLeft:12}}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
                <Text style={{fontWeight:'700',fontSize:14,color:COLORS.text}}>{d.label}</Text>
                {d.required&&<View style={{backgroundColor:COLORS.orangeBg,borderRadius:6,paddingHorizontal:6,paddingVertical:2}}>
                  <Text style={{fontSize:10,color:COLORS.brand,fontWeight:'700'}}>Required</Text>
                </View>}
              </View>
              <Text style={{color:COLORS.muted,fontSize:12,marginTop:3}}>{d.hint}</Text>
            </View>
            <Text style={{fontSize:22}}>{docs[d.key]?'✅':'📷'}</Text>
          </View>
          {docs[d.key]&&<Image source={{uri:docs[d.key].uri}} style={{width:'100%',height:100,borderRadius:10,marginTop:12}} resizeMode="cover"/>}
          {!docs[d.key]&&(
            <View style={{flexDirection:'row',gap:8,marginTop:12}}>
              <TouchableOpacity onPress={()=>pick(d.key,true)}
                style={{flex:1,borderWidth:1,borderColor:COLORS.border,borderRadius:10,padding:10,alignItems:'center'}}>
                <Text style={{fontSize:13,color:COLORS.text}}>📷 Camera</Text>
              </TouchableOpacity>
              {!d.cam&&<TouchableOpacity onPress={()=>pick(d.key,false)}
                style={{flex:1,borderWidth:1,borderColor:COLORS.border,borderRadius:10,padding:10,alignItems:'center'}}>
                <Text style={{fontSize:13,color:COLORS.text}}>🖼 Gallery</Text>
              </TouchableOpacity>}
            </View>
          )}
        </Card>
      ))}
      <Button label="Submit for Verification 🚀" onPress={submit} style={{marginBottom:40}}/>
    </ScrollView>
  );
}

// ── RECEIVER HOME ─────────────────────────────────────────────────────────────
function ReceiverHomeScreen({ navigation }) {
  const user=useAuthStore(s=>s.user);
  const {myDeliveries,myLoading,fetchMyDeliveries}=useDeliveryStore();
  useEffect(()=>{fetchMyDeliveries('receiver');},[]);
  const active=myDeliveries.find(d=>['pending','accepted','pickup_verified','in_transit'].includes(d.status));
  const history=myDeliveries.filter(d=>['delivered','cancelled'].includes(d.status)).slice(0,5);
  return (
    <ScrollView style={{flex:1,backgroundColor:COLORS.bg}}
      refreshControl={<RefreshControl refreshing={myLoading} onRefresh={()=>fetchMyDeliveries('receiver')}/>}>
      <HeroHeader>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
          <View>
            <Text style={{color:'rgba(255,255,255,0.6)',fontSize:13,fontWeight:'600'}}>GOOD MORNING 👋</Text>
            <Text style={{color:'#fff',fontSize:26,fontWeight:'800',marginTop:2}}>{user?.fullName?.split(' ')[0]}</Text>
            <View style={{flexDirection:'row',gap:8,marginTop:8}}>
              <Chip label={`⭐ ${user?.rating?.average?.toFixed(1)||'—'}`} color="gray"/>
              <Chip label="● Verified" color="green"/>
            </View>
          </View>
          <TouchableOpacity onPress={()=>navigation.navigate('Profile')}>
            <Avatar name={user?.fullName} size={52}/>
          </TouchableOpacity>
        </View>
        <View style={{backgroundColor:'rgba(255,255,255,0.08)',borderRadius:16,padding:14,marginTop:18,
                       flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
          <View>
            <Text style={{color:'rgba(255,255,255,0.5)',fontSize:10,fontWeight:'800',letterSpacing:1}}>WALLET BALANCE</Text>
            <Text style={{color:'#fff',fontSize:26,fontWeight:'800',marginTop:2}}>₹ {user?.wallet?.balance?.toFixed(0)||'0'}</Text>
          </View>
          <TouchableOpacity onPress={()=>navigation.navigate('Wallet')}
            style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,paddingHorizontal:14,paddingVertical:9}}>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:13}}>+ Add Money</Text>
          </TouchableOpacity>
        </View>
      </HeroHeader>
      <View style={{padding:16}}>
        {active&&(
          <Card urgent style={{marginBottom:16}}>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
              <Text style={{fontSize:15,fontWeight:'800',color:COLORS.text}}>Active Delivery</Text>
              <Chip label={active.status==='pending'?'⏳ Finding Carrier':'● In Transit'} color={active.status==='pending'?'orange':'blue'}/>
            </View>
            {active.carrier&&(
              <View style={{flexDirection:'row',alignItems:'center',marginBottom:12}}>
                <Avatar name={active.carrier.fullName} size={44}/>
                <View style={{flex:1,marginLeft:10}}>
                  <Text style={{fontWeight:'700',fontSize:14}}>{active.carrier.fullName}</Text>
                  <Text style={{color:COLORS.muted,fontSize:12,marginTop:2}}>⭐ {active.carrier.rating?.average?.toFixed(1)} · {active.carrier.stats?.deliveriesAsCarrier||0} deliveries</Text>
                </View>
                <TouchableOpacity onPress={()=>navigation.navigate('Chat',{deliveryId:active._id})}
                  style={{borderWidth:1,borderColor:COLORS.border,borderRadius:10,padding:8}}>
                  <Text>💬</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={()=>navigation.navigate('Track',{deliveryId:active._id})}
              style={{backgroundColor:COLORS.brand,borderRadius:12,padding:12,alignItems:'center'}}>
              <Text style={{color:'#fff',fontWeight:'700'}}>📍 Track Live</Text>
            </TouchableOpacity>
          </Card>
        )}
        <Text style={{fontSize:16,fontWeight:'800',color:COLORS.text,marginBottom:12}}>Quick Actions</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:20}}>
          {[{emoji:'📦',label:'Post Request',sub:'New delivery',screen:'PostDelivery'},
            {emoji:'📋',label:'My Orders',   sub:'History',     screen:'MyDeliveries'},
            {emoji:'💰',label:'Wallet',      sub:`₹${user?.wallet?.balance?.toFixed(0)||0}`,screen:'Wallet'},
            {emoji:'👤',label:'Profile',     sub:`⭐${user?.rating?.average?.toFixed(1)||'—'}`,screen:'Profile'}].map(q=>(
            <TouchableOpacity key={q.label} onPress={()=>navigation.navigate(q.screen)}
              style={{width:'47%',backgroundColor:'#fff',borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border}}>
              <Text style={{fontSize:28,marginBottom:8}}>{q.emoji}</Text>
              <Text style={{fontSize:13,fontWeight:'700',color:COLORS.text}}>{q.label}</Text>
              <Text style={{fontSize:11,color:COLORS.muted,marginTop:3}}>{q.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {history.length>0&&<>
          <Text style={{fontSize:16,fontWeight:'800',color:COLORS.text,marginBottom:10}}>Recent Activity</Text>
          {history.map(d=><HistoryCard key={d._id} delivery={d} role="receiver" onPress={()=>navigation.navigate('Track',{deliveryId:d._id})}/>)}
        </>}
        {!active&&myDeliveries.length===0&&!myLoading&&(
          <EmptyState emoji="📦" title="No Deliveries Yet" subtitle="Post a request when your Zomato or Blinkit order is on the way!"/>
        )}
      </View>
    </ScrollView>
  );
}

// ── POST DELIVERY ─────────────────────────────────────────────────────────────
function PostDeliveryScreen({ navigation }) {
  const user=useAuthStore(s=>s.user);
  const create=useDeliveryStore(s=>s.create);
  const [app,setApp]=useState(null);
  const [desc,setDesc]=useState('');
  const [fromT,setFromT]=useState('14:00');
  const [toT,setToT]=useState('14:30');
  const [block,setBlock]=useState(user?.college?.hostelBlock||'');
  const [room,setRoom]=useState(user?.college?.roomNumber||'');
  const [comm,setComm]=useState(MIN_COMMISSION);
  const [loading,setLoading]=useState(false);
  const total=comm+PLATFORM_CUT;
  const canAfford=(user?.wallet?.balance||0)>=total;
  const submit=async()=>{
    if(!app) return Toast.show({type:'error',text1:'Select a delivery app'});
    if(!desc) return Toast.show({type:'error',text1:'Add a description'});
    if(!block||!room) return Toast.show({type:'error',text1:'Enter hostel block and room'});
    if(!canAfford) return Toast.show({type:'error',text1:`Need ₹${total} in wallet`});
    setLoading(true);
    try {
      const today=new Date().toDateString();
      const res=await create({app,description:desc,windowFrom:new Date(`${today} ${fromT}`).toISOString(),
        windowTo:new Date(`${today} ${toT}`).toISOString(),hostelBlock:block,roomNumber:room,commission:comm});
      Toast.show({type:'success',text1:'🎉 Posted!',text2:'Carriers nearby can see it now.'});
      navigation.navigate('Track',{deliveryId:res.delivery._id,pickupOtp:res.pickupOtp,deliveryOtp:res.deliveryOtp});
    } catch(e){Toast.show({type:'error',text1:'Failed',text2:e.message});}
    finally{setLoading(false);}
  };
  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScreenHeader title="Post Delivery Request" subtitle="Someone will pick it up for you" onBack={()=>navigation.goBack()}/>
      <ScrollView contentContainerStyle={{padding:16}} keyboardShouldPersistTaps="handled">
        <SectionLabel>DELIVERY APP</SectionLabel>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16}}>
          {DELIVERY_APPS.map(a=>(
            <TouchableOpacity key={a.key} onPress={()=>setApp(a.key)}
              style={{width:'30%',borderWidth:1.5,borderRadius:12,padding:10,alignItems:'center',
                       borderColor:app===a.key?a.color:COLORS.border,backgroundColor:app===a.key?a.color+'12':'#fff'}}>
              <Text style={{fontSize:22}}>{a.emoji}</Text>
              <Text style={{fontSize:11,color:app===a.key?a.color:COLORS.muted,marginTop:4,fontWeight:'600'}}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Input label="Order Description" placeholder="e.g. 2 boxes of biryani, 1 drink" value={desc} onChangeText={setDesc} autoCapitalize="sentences" icon="📝"/>
        <SectionLabel>DELIVERY WINDOW</SectionLabel>
        <View style={{flexDirection:'row',gap:10}}>
          <Input label="From" value={fromT} onChangeText={setFromT} placeholder="14:00" style={{flex:1}}/>
          <Input label="To" value={toT} onChangeText={setToT} placeholder="14:30" style={{flex:1}}/>
        </View>
        <View style={{flexDirection:'row',gap:10}}>
          <Input label="Hostel Block" value={block} onChangeText={setBlock} placeholder="Block C" autoCapitalize="words" style={{flex:1}}/>
          <Input label="Room No." value={room} onChangeText={setRoom} placeholder="C-204" autoCapitalize="characters" style={{flex:1}}/>
        </View>
        <Card style={{backgroundColor:COLORS.orangeBg,borderColor:'#FFD1B3'}}>
          <Text style={{fontWeight:'700',color:COLORS.brand,marginBottom:12}}>💰 Commission Offer</Text>
          <View style={{flexDirection:'row',alignItems:'center'}}>
            <TouchableOpacity onPress={()=>setComm(c=>Math.max(MIN_COMMISSION,c-5))}
              style={{width:40,height:40,borderRadius:10,borderWidth:1.5,borderColor:COLORS.brand,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:22,color:COLORS.brand,lineHeight:26}}>−</Text>
            </TouchableOpacity>
            <Text style={{flex:1,textAlign:'center',fontSize:36,fontWeight:'800',color:COLORS.brand}}>₹{comm}</Text>
            <TouchableOpacity onPress={()=>setComm(c=>Math.min(100,c+5))}
              style={{width:40,height:40,borderRadius:10,backgroundColor:COLORS.brand,alignItems:'center',justifyContent:'center'}}>
              <Text style={{fontSize:22,color:'#fff',lineHeight:26}}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={{textAlign:'center',color:COLORS.muted,fontSize:11,marginTop:6}}>Higher = faster pickup!</Text>
          <Divider/>
          {[['Commission',`₹${comm}`],['Platform fee',`₹${PLATFORM_CUT}`],['Total deducted',`₹${total}`]].map(([k,v],i)=>(
            <View key={k} style={{flexDirection:'row',justifyContent:'space-between',marginBottom:4}}>
              <Text style={{color:i===2?COLORS.text:COLORS.muted,fontWeight:i===2?'700':'400',fontSize:13}}>{k}</Text>
              <Text style={{color:i===2?COLORS.text:COLORS.muted,fontWeight:i===2?'700':'400',fontSize:13}}>{v}</Text>
            </View>
          ))}
          <View style={{backgroundColor:'#dbeafe',borderRadius:10,padding:10,marginTop:10}}>
            <Text style={{color:'#1e40af',fontSize:12}}>🔒 ₹{total} locked in escrow. Released only after OTP confirmation.</Text>
          </View>
          {!canAfford&&<View style={{backgroundColor:'#FEF2F2',borderRadius:10,padding:10,marginTop:8}}>
            <Text style={{color:COLORS.red,fontSize:12}}>⚠️ Insufficient balance. Add ₹{total-(user?.wallet?.balance||0)} more.</Text>
          </View>}
        </Card>
        <Button label={`🚀 Post Request — ₹${comm}`} onPress={submit} loading={loading} disabled={!canAfford} style={{marginBottom:32}}/>
      </ScrollView>
    </View>
  );
}

// ── CARRIER HOME ──────────────────────────────────────────────────────────────
function CarrierHomeScreen({ navigation }) {
  const user=useAuthStore(s=>s.user);
  const {feed,feedLoading,fetchFeed,addToFeed,removeFromFeed,bumpCommission,accept}=useDeliveryStore();
  const [online,setOnline]=useState(false);
  const [accepting,setAccepting]=useState(null);
  const [flash,setFlash]=useState(null);
  useEffect(()=>{fetchFeed();},[]);
  useEffect(()=>{
    const onNew=d=>{addToFeed(d);setFlash(d.deliveryId||d._id);setTimeout(()=>setFlash(null),3000);};
    const onTaken=d=>removeFromFeed(d.deliveryId||d._id);
    const onBumped=d=>bumpCommission(d.deliveryId||d._id,d.newCommission);
    on('new_delivery_request',onNew); on('delivery_taken',onTaken); on('commission_bumped',onBumped);
    return()=>{off('new_delivery_request',onNew);off('delivery_taken',onTaken);off('commission_bumped',onBumped);};
  },[]);
  const toggleOnline=async val=>{
    setOnline(val);
    if(val){goCarrierOnline();try{await usersAPI.setOnlineStatus(true);}catch{}
             Toast.show({type:'success',text1:"🟢 You're Online"});}
    else{goCarrierOffline();try{await usersAPI.setOnlineStatus(false);}catch{};}
  };
  const handleAccept=async id=>{
    setAccepting(id);
    try{const res=await accept(id);Toast.show({type:'success',text1:'⚡ Accepted!',text2:'Head to the main gate now.'});
        navigation.navigate('Track',{deliveryId:res.delivery._id});}
    catch(e){Toast.show({type:'error',text1:'Too slow!',text2:e.message});fetchFeed();}
    finally{setAccepting(null);}
  };
  const Header=()=>(
    <View>
      <HeroHeader>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'}}>
          <View>
            <Text style={{color:'rgba(255,255,255,0.6)',fontSize:13,fontWeight:'600'}}>GOOD MORNING 🌅</Text>
            <Text style={{color:'#fff',fontSize:26,fontWeight:'800',marginTop:2}}>{user?.fullName?.split(' ')[0]}</Text>
            <View style={{flexDirection:'row',gap:8,marginTop:8}}>
              <Chip label={`⭐ ${user?.rating?.average?.toFixed(1)||'—'}`} color="gray"/>
              <Chip label={`🔥 ${user?.stats?.streak||0} streak`} color="orange"/>
            </View>
          </View>
          <TouchableOpacity onPress={()=>navigation.navigate('Profile')}>
            <Avatar name={user?.fullName} size={52} bg="#06B96F22" color={COLORS.green}/>
          </TouchableOpacity>
        </View>
        <View style={{backgroundColor:'rgba(255,255,255,0.08)',borderRadius:16,padding:14,marginTop:18,
                       flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
          <View>
            <Text style={{color:'rgba(255,255,255,0.5)',fontSize:10,fontWeight:'800',letterSpacing:1}}>WALLET</Text>
            <Text style={{color:'#fff',fontSize:26,fontWeight:'800',marginTop:2}}>₹{user?.wallet?.balance?.toFixed(0)||0}</Text>
            <Text style={{color:'rgba(255,255,255,0.4)',fontSize:11,marginTop:2}}>{user?.stats?.deliveriesAsCarrier||0} total deliveries</Text>
          </View>
          <TouchableOpacity onPress={()=>navigation.navigate('Wallet')}
            style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:12,padding:10}}>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>Earnings →</Text>
          </TouchableOpacity>
        </View>
      </HeroHeader>
      <View style={{margin:16,backgroundColor:'#fff',borderRadius:16,padding:16,borderWidth:1,borderColor:COLORS.border}}>
        <Toggle value={online} onValueChange={toggleOnline}
          label={online?"🟢 You're Online":"⚫ You're Offline"}
          sublabel={online?'Accepting delivery requests':'Toggle to see requests'}/>
      </View>
      {online&&<View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingHorizontal:16,marginBottom:8}}>
        <Text style={{fontSize:17,fontWeight:'800',color:COLORS.text}}>Available Requests</Text>
        <Chip label={`${feed.length} nearby`} color="orange"/>
      </View>}
    </View>
  );
  if(!online) return <View style={{flex:1,backgroundColor:COLORS.bg}}><Header/><EmptyState emoji="⚫" title="You're Offline" subtitle="Toggle the switch above to start receiving delivery requests."/></View>;
  return (
    <FlatList style={{flex:1,backgroundColor:COLORS.bg}} ListHeaderComponent={<Header/>}
      data={feed} keyExtractor={item=>item._id||item.deliveryId||String(Math.random())}
      renderItem={({item})=>(
        <View style={{marginHorizontal:16,borderRadius:16,overflow:'hidden',
                       ...(flash===(item._id||item.deliveryId)&&{borderWidth:2,borderColor:COLORS.brand})}}>
          {flash===(item._id||item.deliveryId)&&<View style={{backgroundColor:COLORS.brand,paddingHorizontal:12,paddingVertical:6,borderRadius:8,alignSelf:'flex-start',margin:8}}>
            <Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>🆕 New!</Text>
          </View>}
          <FeedCard delivery={item} onAccept={()=>handleAccept(item._id||item.deliveryId)} loading={accepting===(item._id||item.deliveryId)}/>
        </View>
      )}
      contentContainerStyle={{paddingBottom:100}}
      refreshControl={<RefreshControl refreshing={feedLoading} onRefresh={fetchFeed}/>}
      ListEmptyComponent={<EmptyState emoji="📭" title="No Requests Right Now" subtitle="New requests appear here instantly when posted."/>}
    />
  );
}

// ── TRACK DELIVERY ────────────────────────────────────────────────────────────
function TrackDeliveryScreen({ route, navigation }) {
  const {deliveryId,pickupOtp,deliveryOtp}=route.params;
  const user=useAuthStore(s=>s.user);
  const {active,fetchActive,updateActiveStatus,updateCarrierLocation}=useDeliveryStore();
  const [otp,setOtp]=useState('');
  const [otpModal,setOtpModal]=useState(false);
  const [otpMode,setOtpMode]=useState('');
  const [otpLoading,setOtpLoading]=useState(false);
  const [anomaly,setAnomaly]=useState(false);
  const locSubRef=useRef(null);
  const uid=user?._id||user?.id;
  const isReceiver=active?.receiver?._id===uid||active?.receiver===uid;
  const isCarrier=active?.carrier?._id===uid||active?.carrier===uid;
  useEffect(()=>{
    fetchActive(deliveryId);
    joinDeliveryRoom(deliveryId);
    const onLoc=d=>{if(d.deliveryId===deliveryId)updateCarrierLocation(d.lat,d.lng);};
    const onPickup=()=>{updateActiveStatus('pickup_verified');Toast.show({type:'success',text1:'📦 Parcel Picked Up!'});};
    const onDone=()=>{updateActiveStatus('delivered');navigation.navigate('Rate',{deliveryId});};
    const onCancel=()=>{updateActiveStatus('cancelled');Alert.alert('Cancelled','Delivery was cancelled');};
    const onAnomaly=()=>setAnomaly(true);
    on('carrier_location_update',onLoc);on('pickup_verified',onPickup);on('delivery_completed',onDone);on('delivery_cancelled',onCancel);on('carrier_anomaly',onAnomaly);
    if(isCarrier) startLoc();
    return()=>{
      leaveDeliveryRoom(deliveryId);
      off('carrier_location_update',onLoc);off('pickup_verified',onPickup);off('delivery_completed',onDone);off('delivery_cancelled',onCancel);off('carrier_anomaly',onAnomaly);
      locSubRef.current?.remove();
    };
  },[deliveryId]);
  const startLoc=async()=>{
    const {status}=await Location.requestForegroundPermissionsAsync();
    if(status!=='granted') return;
    const sub=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,timeInterval:5000,distanceInterval:10},
      loc=>sendLocation(deliveryId,loc.coords.latitude,loc.coords.longitude));
    locSubRef.current=sub;
  };
  const confirmOtp=async()=>{
    if(otp.length<4) return Toast.show({type:'error',text1:'Enter 4-digit OTP'});
    setOtpLoading(true);
    try{
      const form=new FormData(); form.append('otp',otp);
      if(otpMode==='pickup') await deliveryAPI.verifyPickup(deliveryId,form);
      else await deliveryAPI.confirmDelivery(deliveryId,form);
      setOtpModal(false);setOtp('');
      Toast.show({type:'success',text1:otpMode==='pickup'?'✅ Pickup Verified!':'🎉 Delivered!'});
    }catch(e){Toast.show({type:'error',text1:'Wrong OTP',text2:e.message});}
    finally{setOtpLoading(false);}
  };
  if(!active) return <LoadingScreen message="Loading delivery..."/>;
  const steps=[
    {label:'Carrier Accepted',     done:['accepted','pickup_verified','in_transit','delivered'].includes(active.status)},
    {label:'Parcel Picked Up',     done:['pickup_verified','in_transit','delivered'].includes(active.status)},
    {label:'En Route to Hostel',   done:['in_transit','delivered'].includes(active.status)},
    {label:'Delivered ✅',          done:active.status==='delivered'},
  ];
  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScreenHeader title="Live Tracking" subtitle={`Delivery ${active.deliveryCode||''}`} onBack={()=>navigation.goBack()}/>
      <ScrollView contentContainerStyle={{padding:16}}>
        {anomaly&&<View style={{backgroundColor:'#FEF3C7',borderRadius:12,padding:12,marginBottom:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
          <Text style={{fontSize:12,color:'#92400e',flex:1}}>⚠️ Carrier appears far from campus.</Text>
          <TouchableOpacity onPress={()=>navigation.navigate('Chat',{deliveryId})}><Text style={{color:COLORS.brand,fontWeight:'700',fontSize:12}}>Chat →</Text></TouchableOpacity>
        </View>}
        <SimpleMap carrierLat={active.carrierLat} carrierLng={active.carrierLng} style={{marginBottom:12}}/>
        {active.carrier&&(
          <Card style={{flexDirection:'row',alignItems:'center',marginBottom:12}}>
            <Avatar name={active.carrier.fullName} size={48}/>
            <View style={{flex:1,marginLeft:12}}>
              <Text style={{fontWeight:'700',fontSize:15}}>{active.carrier.fullName}</Text>
              <Stars rating={active.carrier.rating?.average||0} size={12}/>
              {active.carrierLat&&<View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:4}}><LiveDot/><Text style={{fontSize:12,color:COLORS.green}}>Live location active</Text></View>}
            </View>
            <TouchableOpacity onPress={()=>navigation.navigate('Chat',{deliveryId})} style={{borderWidth:1,borderColor:COLORS.border,borderRadius:10,padding:9}}>
              <Text>💬</Text>
            </TouchableOpacity>
          </Card>
        )}
        {isReceiver&&pickupOtp&&active.status!=='delivered'&&(
          <Card style={{backgroundColor:COLORS.orangeBg,borderColor:'#FFD1B3',marginBottom:12}}>
            <Text style={{fontWeight:'700',color:COLORS.brand,marginBottom:12}}>🔑 Your OTPs</Text>
            <View style={{flexDirection:'row',gap:10}}>
              {[{label:'PICKUP OTP',code:pickupOtp},{label:'DELIVERY OTP',code:deliveryOtp}].map(o=>(
                <View key={o.label} style={{flex:1,borderWidth:2,borderRadius:12,padding:12,alignItems:'center',borderColor:COLORS.brand}}>
                  <Text style={{fontSize:10,fontWeight:'800',color:COLORS.muted}}>{o.label}</Text>
                  <Text style={{fontSize:28,fontWeight:'800',color:COLORS.brand,letterSpacing:6,marginVertical:4}}>{o.code}</Text>
                  <Text style={{fontSize:10,color:COLORS.muted,textAlign:'center'}}>Share with carrier</Text>
                </View>
              ))}
            </View>
          </Card>
        )}
        <SectionLabel>PROGRESS</SectionLabel>
        <View style={{marginBottom:16}}>
          {steps.map((st,i)=>(
            <View key={i} style={{flexDirection:'row',alignItems:'flex-start',marginBottom:8}}>
              <View style={{width:12,height:12,borderRadius:6,marginRight:12,marginTop:3,flexShrink:0,
                             backgroundColor:st.done?COLORS.green:i===steps.findIndex(s=>!s.done)?COLORS.brand:COLORS.border}}/>
              <Text style={{fontSize:13,fontWeight:'600',color:st.done?COLORS.text:COLORS.muted,flex:1}}>{st.label}</Text>
            </View>
          ))}
        </View>
        {isCarrier&&active.status==='accepted'&&<Button label="📦 I've Reached the Gate — Enter Pickup OTP" onPress={()=>{setOtpMode('pickup');setOtpModal(true);}} style={{marginBottom:10}}/>}
        {isCarrier&&active.status==='pickup_verified'&&<Button label="🏠 I'm at the Hostel — Enter Delivery OTP" onPress={()=>{setOtpMode('delivery');setOtpModal(true);}} style={{marginBottom:10}}/>}
        {isReceiver&&active.status==='pickup_verified'&&<Button label="✅ Confirm Delivery — Enter OTP" onPress={()=>{setOtpMode('delivery');setOtpModal(true);}} style={{marginBottom:10}}/>}
        <TouchableOpacity onPress={()=>navigation.navigate('Dispute',{deliveryId})} style={{alignItems:'center',padding:12}}>
          <Text style={{color:COLORS.muted,fontSize:13}}>⚠️ Report an Issue</Text>
        </TouchableOpacity>
        {isReceiver&&active.status==='pending'&&<Button label="Cancel Request" variant="ghost"
          onPress={()=>Alert.alert('Cancel?','Full refund will be issued.',[
            {text:'Keep it',style:'cancel'},
            {text:'Cancel',style:'destructive',onPress:async()=>{await deliveryAPI.cancel(deliveryId,'Cancelled by receiver');navigation.goBack();}}
          ])}/>}
      </ScrollView>
      <Modal visible={otpModal} transparent animationType="slide">
        <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'}}>
          <View style={{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24}}>
            <Text style={{fontSize:18,fontWeight:'800',textAlign:'center',color:COLORS.text}}>
              {otpMode==='pickup'?'📦 Enter Pickup OTP':'🔑 Enter Delivery OTP'}
            </Text>
            <Text style={{textAlign:'center',color:COLORS.muted,fontSize:13,marginTop:6}}>
              {isCarrier?'Ask the receiver for the code':'Enter the OTP you received'}
            </Text>
            <OtpInput value={otp} onChange={setOtp}/>
            <Button label="Confirm ✅" onPress={confirmOtp} loading={otpLoading}/>
            <Button label="Cancel" variant="ghost" onPress={()=>{setOtpModal(false);setOtp('');}} style={{marginTop:8}}/>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── CHAT ──────────────────────────────────────────────────────────────────────
function ChatScreen({ route, navigation }) {
  const {deliveryId}=route.params;
  const user=useAuthStore(s=>s.user);
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState('');
  const [otherTyping,setOtherTyping]=useState(false);
  const flatRef=useRef(null);
  const typingRef=useRef(null);
  const uid=user?._id||user?.id;
  useEffect(()=>{
    joinDeliveryRoom(deliveryId);
    chatAPI.getMessages(deliveryId).then(r=>{setMessages(r.messages||[]);setTimeout(()=>flatRef.current?.scrollToEnd(),100);}).catch(()=>{});
    const onMsg=d=>{if(d.deliveryId===deliveryId){setMessages(m=>[...m,d.message]);setTimeout(()=>flatRef.current?.scrollToEnd({animated:true}),50);}};
    const onTyp=d=>{if(d.userId!==uid)setOtherTyping(true);};
    const onStop=d=>{if(d.userId!==uid)setOtherTyping(false);};
    on('new_message',onMsg);on('user_typing',onTyp);on('user_stop_typing',onStop);
    return()=>{leaveDeliveryRoom(deliveryId);off('new_message',onMsg);off('user_typing',onTyp);off('user_stop_typing',onStop);};
  },[deliveryId]);
  const handleChange=v=>{
    setText(v);emitTyping(deliveryId);
    clearTimeout(typingRef.current);
    typingRef.current=setTimeout(()=>emitStopTyping(deliveryId),1500);
  };
  const send=async(content=text)=>{
    if(!content.trim()) return;
    try{await chatAPI.sendMessage(deliveryId,content.trim());setText('');}
    catch{Toast.show({type:'error',text1:'Failed to send'});}
  };
  const QUICK=['On my way!',"I'm at the gate","What's the OTP?","I'm outside your room",'Running 5 mins late'];
  return (
    <KeyboardAvoidingView style={{flex:1,backgroundColor:COLORS.bg}} behavior={Platform.OS==='ios'?'padding':'height'} keyboardVerticalOffset={Platform.OS==='ios'?90:0}>
      <LinearGradient colors={[COLORS.brandDark,'#2D2D4E']} style={{flexDirection:'row',alignItems:'center',paddingHorizontal:16,paddingVertical:14,paddingTop:20,gap:12}}>
        <TouchableOpacity onPress={()=>navigation.goBack()}><Text style={{color:'#fff',fontSize:22}}>←</Text></TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={{color:'#fff',fontWeight:'700',fontSize:15}}>Delivery Chat</Text>
          <View style={{flexDirection:'row',alignItems:'center',gap:6,marginTop:2}}>
            <LiveDot size={6}/>
            <Text style={{color:'rgba(255,255,255,0.6)',fontSize:11}}>{otherTyping?'Typing...':'Secure · End-to-end'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={()=>navigation.navigate('Track',{deliveryId})} style={{backgroundColor:'rgba(255,255,255,0.15)',borderRadius:10,paddingHorizontal:12,paddingVertical:6}}>
          <Text style={{color:'#fff',fontSize:12,fontWeight:'700'}}>📍 Track</Text>
        </TouchableOpacity>
      </LinearGradient>
      <FlatList ref={flatRef} data={messages} keyExtractor={(m,i)=>m._id||String(i)}
        contentContainerStyle={{padding:12,paddingBottom:4}}
        onContentSizeChange={()=>flatRef.current?.scrollToEnd({animated:true})}
        renderItem={({item})=>{
          const isMe=item.sender?._id===uid||item.sender===uid;
          const isSys=item.type==='system';
          if(isSys) return <View style={{alignSelf:'center',backgroundColor:'#F3F3F5',borderRadius:12,paddingHorizontal:14,paddingVertical:6,marginVertical:6}}><Text style={{fontSize:11,color:COLORS.muted,textAlign:'center'}}>{item.content}</Text></View>;
          return (
            <View style={{flexDirection:isMe?'row-reverse':'row',marginBottom:6,alignItems:'flex-end'}}>
              {!isMe&&<Avatar name={item.sender?.fullName||'?'} size={28} style={{marginRight:8}}/>}
              <View style={{maxWidth:'75%',borderRadius:18,padding:10,paddingHorizontal:14,
                             backgroundColor:isMe?COLORS.brand:'#fff',borderWidth:isMe?0:1,borderColor:COLORS.border,
                             borderBottomRightRadius:isMe?4:18,borderBottomLeftRadius:isMe?18:4}}>
                <Text style={{fontSize:14,color:isMe?'#fff':COLORS.text,lineHeight:20}}>{item.content}</Text>
                <Text style={{fontSize:10,color:isMe?'rgba(255,255,255,0.6)':COLORS.muted,marginTop:4,alignSelf:'flex-end'}}>
                  {formatDistanceToNow(new Date(item.createdAt||Date.now()),{addSuffix:true})}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60}}><Text style={{fontSize:36,marginBottom:10}}>💬</Text><Text style={{color:COLORS.muted,fontSize:14}}>No messages yet. Say hello!</Text></View>}
      />
      <FlatList horizontal data={QUICK} keyExtractor={i=>i} showsHorizontalScrollIndicator={false}
        contentContainerStyle={{paddingHorizontal:12,paddingVertical:8,gap:8}}
        renderItem={({item})=>(
          <TouchableOpacity onPress={()=>send(item)} style={{borderWidth:1,borderColor:COLORS.border,borderRadius:20,paddingHorizontal:14,paddingVertical:7,backgroundColor:'#fff'}}>
            <Text style={{fontSize:12,color:COLORS.text}}>{item}</Text>
          </TouchableOpacity>
        )}/>
      <View style={{flexDirection:'row',alignItems:'flex-end',backgroundColor:'#fff',borderTopWidth:1,borderTopColor:COLORS.border,padding:10,gap:8}}>
        <TextInput value={text} onChangeText={handleChange} placeholder="Type a message..." placeholderTextColor={COLORS.muted} multiline maxLength={500}
          style={{flex:1,borderWidth:1.5,borderColor:COLORS.border,borderRadius:24,paddingHorizontal:16,paddingVertical:10,fontSize:14,maxHeight:100,color:COLORS.text}}/>
        <TouchableOpacity onPress={()=>send()} disabled={!text.trim()}
          style={{width:44,height:44,borderRadius:22,backgroundColor:COLORS.brand,alignItems:'center',justifyContent:'center',opacity:text.trim()?1:0.5}}>
          <Text style={{color:'#fff',fontSize:18}}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── WALLET ────────────────────────────────────────────────────────────────────
function WalletScreen({ navigation }) {
  const user=useAuthStore(s=>s.user);
  const refreshUser=useAuthStore(s=>s.refreshUser);
  const [balance,setBalance]=useState(user?.wallet?.balance||0);
  const [escrow,setEscrow]=useState(user?.wallet?.escrow||0);
  const [txns,setTxns]=useState([]);
  const [loading,setLoading]=useState(false);
  const [topupModal,setTopupModal]=useState(false);
  const [withdrawModal,setWithdrawModal]=useState(false);
  const [amount,setAmount]=useState('');
  useEffect(()=>{load();},[]);
  const load=async()=>{
    setLoading(true);
    try{const[b,t]=await Promise.all([walletAPI.getBalance(),walletAPI.getTransactions()]);
        setBalance(b.wallet.balance);setEscrow(b.wallet.escrow);setTxns(t.transactions||[]);}
    finally{setLoading(false);}
  };
  const handleTopup=async()=>{
    const amt=parseInt(amount);
    if(!amt||amt<30) return Toast.show({type:'error',text1:'Minimum ₹30'});
    try{
      const{order}=await walletAPI.createOrder(amt);
      const url=`https://rzp.io/l/campusrelay?amount=${amt*100}&order_id=${order.id}`;
      await WebBrowser.openBrowserAsync(url);
      Toast.show({type:'info',text1:'Complete payment in browser',text2:'Wallet updates automatically.'});
      setTopupModal(false);setAmount('');
    }catch(e){Toast.show({type:'error',text1:'Failed',text2:e.message});}
  };
  const handleWithdraw=async()=>{
    const amt=parseInt(amount);
    if(!amt||amt<50) return Toast.show({type:'error',text1:'Minimum withdrawal ₹50'});
    if(amt>balance) return Toast.show({type:'error',text1:'Insufficient balance'});
    try{await walletAPI.withdraw(amt);Toast.show({type:'success',text1:`₹${amt} withdrawal initiated`,text2:'Processed within 24 hours'});
        setWithdrawModal(false);setAmount('');await load();await refreshUser();}
    catch(e){Toast.show({type:'error',text1:'Failed',text2:e.message});}
  };
  const TX={topup:'💳',escrow_lock:'🔒',escrow_release:'✅',escrow_refund:'↩️',commission_earn:'💰',withdrawal:'🏦',platform_cut:'⚙️'};
  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScreenHeader title="My Wallet" subtitle="Balance, payments & history" onBack={()=>navigation.goBack()}/>
      <ScrollView contentContainerStyle={{padding:16}} refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}>
        <LinearGradient colors={[COLORS.brandDark,'#2D2D4E']} style={{borderRadius:24,padding:24,marginBottom:16}}>
          <Text style={{color:'rgba(255,255,255,0.5)',fontSize:10,fontWeight:'800',letterSpacing:1}}>AVAILABLE BALANCE</Text>
          <Text style={{color:'#fff',fontSize:40,fontWeight:'800',marginTop:4}}>₹ {balance.toFixed(2)}</Text>
          {escrow>0&&<Text style={{color:'rgba(255,255,255,0.4)',fontSize:12,marginTop:4}}>₹{escrow} in escrow</Text>}
          <View style={{flexDirection:'row',gap:10,marginTop:20}}>
            <TouchableOpacity onPress={()=>setTopupModal(true)} style={{flex:1,backgroundColor:COLORS.brand,borderRadius:12,padding:12,alignItems:'center'}}>
              <Text style={{color:'#fff',fontWeight:'700'}}>+ Add Money</Text>
            </TouchableOpacity>
            {user?.roles?.includes('carrier')&&<TouchableOpacity onPress={()=>setWithdrawModal(true)} style={{flex:1,backgroundColor:'rgba(255,255,255,0.1)',borderRadius:12,padding:12,alignItems:'center'}}>
              <Text style={{color:'rgba(255,255,255,0.8)',fontWeight:'700'}}>↓ Withdraw</Text>
            </TouchableOpacity>}
          </View>
        </LinearGradient>
        <View style={{flexDirection:'row',gap:10,marginBottom:20}}>
          {[['Total Spent',`₹${user?.wallet?.totalSpent?.toFixed(0)||0}`,COLORS.text],
            ['Total Earned',`₹${user?.wallet?.totalEarned?.toFixed(0)||0}`,COLORS.green]].map(([l,v,c])=>(
            <Card key={l} style={{flex:1,alignItems:'center',marginBottom:0}}>
              <Text style={{fontSize:20,fontWeight:'800',color:c}}>{v}</Text>
              <Text style={{fontSize:11,color:COLORS.muted,marginTop:4}}>{l}</Text>
            </Card>
          ))}
        </View>
        <SectionLabel>Transaction History</SectionLabel>
        {txns.length===0?<Text style={{textAlign:'center',color:COLORS.muted,marginTop:16}}>No transactions yet</Text>
        :<Card>
          {txns.map((tx,i)=>(
            <View key={tx._id||i}>
              <View style={{flexDirection:'row',alignItems:'center'}}>
                <View style={{width:42,height:42,borderRadius:12,backgroundColor:COLORS.bg,alignItems:'center',justifyContent:'center'}}>
                  <Text style={{fontSize:20}}>{TX[tx.type]||'💳'}</Text>
                </View>
                <View style={{flex:1,marginLeft:10}}>
                  <Text style={{fontSize:13,fontWeight:'600',color:COLORS.text}}>{tx.note||tx.type}</Text>
                  <Text style={{fontSize:11,color:COLORS.muted,marginTop:2}}>{format(new Date(tx.createdAt||Date.now()),'dd MMM yyyy, hh:mm a')}</Text>
                </View>
                <Text style={{fontSize:14,fontWeight:'800',color:tx.direction==='credit'?COLORS.green:COLORS.red}}>
                  {tx.direction==='credit'?'+':'-'}₹{tx.amount}
                </Text>
              </View>
              {i<txns.length-1&&<Divider style={{marginVertical:8}}/>}
            </View>
          ))}
        </Card>}
      </ScrollView>
      {[{v:topupModal,t:'Add Money 💳',sub:'Funds added via Razorpay',onC:()=>setTopupModal(false),onS:handleTopup,btn:'Pay via UPI / Card'},
        {v:withdrawModal,t:'Withdraw to UPI 🏦',sub:`UPI: ${user?.upiId||'Not set'}`,extra:`Available: ₹${balance.toFixed(2)}`,onC:()=>setWithdrawModal(false),onS:handleWithdraw,btn:'Withdraw'}
      ].map((m,idx)=>(
        <Modal key={idx} visible={m.v} transparent animationType="slide">
          <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.5)',justifyContent:'flex-end'}}>
            <View style={{backgroundColor:'#fff',borderTopLeftRadius:28,borderTopRightRadius:28,padding:24}}>
              <Text style={{fontSize:20,fontWeight:'800',color:COLORS.text}}>{m.t}</Text>
              <Text style={{color:COLORS.muted,fontSize:13,marginTop:4,marginBottom:m.extra?0:16}}>{m.sub}</Text>
              {m.extra&&<Text style={{color:COLORS.green,fontWeight:'700',fontSize:15,marginBottom:14}}>{m.extra}</Text>}
              <View style={{flexDirection:'row',gap:8,marginBottom:14}}>
                {[50,100,200,500].map(a=>(
                  <TouchableOpacity key={a} onPress={()=>setAmount(String(a))}
                    style={{flex:1,borderWidth:1.5,borderRadius:12,padding:10,alignItems:'center',
                             borderColor:amount===String(a)?COLORS.brand:COLORS.border,
                             backgroundColor:amount===String(a)?COLORS.orangeBg:'#fff'}}>
                    <Text style={{fontSize:13,fontWeight:'700',color:amount===String(a)?COLORS.brand:COLORS.text}}>₹{a}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput value={amount} onChangeText={setAmount} placeholder="Custom amount" keyboardType="number-pad" placeholderTextColor={COLORS.muted}
                style={{borderWidth:1.5,borderColor:COLORS.border,borderRadius:14,padding:14,fontSize:15,marginBottom:16,color:COLORS.text}}/>
              <Button label={`${m.btn} — ₹${amount||'—'}`} onPress={m.onS} style={{marginBottom:10}}/>
              <Button label="Cancel" variant="ghost" onPress={()=>{m.onC();setAmount('');}}/>
            </View>
          </View>
        </Modal>
      ))}
    </View>
  );
}

// ── PROFILE ───────────────────────────────────────────────────────────────────
function ProfileScreen({ navigation }) {
  const user=useAuthStore(s=>s.user);
  const logout=useAuthStore(s=>s.logout);
  const switchRole=useAuthStore(s=>s.switchRole);
  const isBoth=user?.roles?.includes('carrier')&&user?.roles?.includes('receiver');
  return (
    <ScrollView style={{flex:1,backgroundColor:COLORS.bg}}>
      <LinearGradient colors={[COLORS.brandDark,'#2D2D4E']} style={{paddingBottom:32,alignItems:'center',paddingTop:20}}>
        <Avatar name={user?.fullName} size={72}/>
        <Text style={{color:'#fff',fontSize:22,fontWeight:'800',marginTop:12}}>{user?.fullName}</Text>
        <Text style={{color:'rgba(255,255,255,0.5)',fontSize:13,marginTop:4}}>{user?.college?.branch} · Year {user?.college?.year}</Text>
        <View style={{flexDirection:'row',gap:8,marginTop:10}}>
          {user?.isActive?<Chip label="✅ Verified" color="green"/>:<Chip label="⏳ Pending" color="orange"/>}
          {user?.roles?.map(r=><Chip key={r} label={r.charAt(0).toUpperCase()+r.slice(1)} color="gray"/>)}
        </View>
      </LinearGradient>
      <View style={{padding:16}}>
        <View style={{flexDirection:'row',gap:10,marginBottom:16,marginTop:-20}}>
          {[[user?.stats?.deliveriesAsReceiver||0,'Orders'],[user?.stats?.deliveriesAsCarrier||0,'Delivered'],[`⭐${user?.rating?.average?.toFixed(1)||'—'}`,'Rating']].map(([v,l])=>(
            <Card key={l} style={{flex:1,alignItems:'center',marginBottom:0}}>
              <Text style={{fontSize:18,fontWeight:'800',color:COLORS.text}}>{v}</Text>
              <Text style={{fontSize:10,color:COLORS.muted,marginTop:4}}>{l}</Text>
            </Card>
          ))}
        </View>
        {isBoth&&<Card style={{backgroundColor:COLORS.orangeBg,borderColor:'#FFD1B3',marginBottom:12}}>
          <Text style={{fontWeight:'700',fontSize:15,marginBottom:4}}>Active Role</Text>
          <Text style={{color:COLORS.muted,fontSize:13,marginBottom:12}}>Currently: <Text style={{color:COLORS.brand,fontWeight:'700'}}>{user.activeRole==='receiver'?'🏠 Receiver':'🛵 Carrier'}</Text></Text>
          <Button label={`Switch to ${user.activeRole==='receiver'?'🛵 Carrier':'🏠 Receiver'}`} variant="ghost" onPress={()=>switchRole(user.activeRole==='receiver'?'carrier':'receiver')} size="sm"/>
        </Card>}
        <SectionLabel>College Info</SectionLabel>
        <Card>
          {[['Block',user?.college?.hostelBlock||'—'],['Room',user?.college?.roomNumber||'—'],['Branch',user?.college?.branch||'—'],['Year',user?.college?.year||'—'],['UPI',user?.upiId||'Not set']].map(([k,v])=>(
            <View key={k} style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
              <Text style={{color:COLORS.muted,fontSize:13}}>{k}</Text>
              <Text style={{fontWeight:'700',fontSize:13,color:COLORS.text}}>{v}</Text>
            </View>
          ))}
        </Card>
        <SectionLabel>Verification</SectionLabel>
        <Card>
          {[['College ID',!!user?.kyc?.collegeIdUrl],['Aadhaar',!!user?.kyc?.aadhaarUrl],['Selfie',!!user?.kyc?.selfieUrl],['AI Match',user?.kyc?.faceMatchPassed],['Admin Approved',user?.isActive]].map(([l,done])=>(
            <View key={l} style={{flexDirection:'row',justifyContent:'space-between',marginBottom:10}}>
              <Text style={{color:COLORS.muted,fontSize:13}}>{l}</Text>
              <Text style={{fontWeight:'700',fontSize:13,color:done?COLORS.green:COLORS.muted}}>{done?'✅ Done':'⏳ Pending'}</Text>
            </View>
          ))}
        </Card>
        <Button label="⬆ Update KYC Documents" variant="ghost" onPress={()=>navigation.navigate('KYC')} style={{marginBottom:10}}/>
        <Button label="🚪 Logout" variant="danger" onPress={()=>Alert.alert('Logout','Are you sure?',[{text:'Cancel',style:'cancel'},{text:'Logout',style:'destructive',onPress:logout}])}/>
        <View style={{height:40}}/>
      </View>
    </ScrollView>
  );
}

// ── MY DELIVERIES ─────────────────────────────────────────────────────────────
function MyDeliveriesScreen({ navigation }) {
  const user=useAuthStore(s=>s.user);
  const{myDeliveries,myLoading,fetchMyDeliveries}=useDeliveryStore();
  const[tab,setTab]=useState('All');
  const role=user?.activeRole||'receiver';
  useEffect(()=>{fetchMyDeliveries(role);},[role]);
  const filtered=myDeliveries.filter(d=>{
    if(tab==='All') return true;
    if(tab==='Active') return['pending','accepted','pickup_verified','in_transit'].includes(d.status);
    if(tab==='Delivered') return d.status==='delivered';
    if(tab==='Cancelled') return['cancelled','disputed'].includes(d.status);
    return true;
  });
  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScreenHeader title={role==='carrier'?'My Deliveries':'My Orders'} subtitle={`${myDeliveries.length} total`} onBack={()=>navigation.goBack()}/>
      <View style={{flexDirection:'row',padding:12,gap:8,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:COLORS.border}}>
        {['All','Active','Delivered','Cancelled'].map(t=>(
          <TouchableOpacity key={t} onPress={()=>setTab(t)}
            style={{flex:1,paddingVertical:8,borderRadius:20,alignItems:'center',backgroundColor:tab===t?COLORS.brand:COLORS.bg}}>
            <Text style={{fontSize:12,fontWeight:'700',color:tab===t?'#fff':COLORS.muted}}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={filtered} keyExtractor={d=>d._id}
        renderItem={({item})=><View style={{paddingHorizontal:16}}><HistoryCard delivery={item} role={role} onPress={()=>navigation.navigate('Track',{deliveryId:item._id})}/></View>}
        contentContainerStyle={{padding:4,paddingBottom:80}}
        refreshControl={<RefreshControl refreshing={myLoading} onRefresh={()=>fetchMyDeliveries(role)}/>}
        ListEmptyComponent={<EmptyState emoji="📭" title="Nothing here yet" subtitle={role==='receiver'?'Post a request to get started!':'Go online to start earning!'}/>}
      />
    </View>
  );
}

// ── RATE DELIVERY ─────────────────────────────────────────────────────────────
function RateDeliveryScreen({ route, navigation }) {
  const{deliveryId}=route.params;
  const user=useAuthStore(s=>s.user);
  const active=useDeliveryStore(s=>s.active);
  const uid=user?._id||user?.id;
  const isRecv=active?.receiver?._id===uid||active?.receiver===uid;
  const other=isRecv?active?.carrier:active?.receiver;
  const tags=isRecv?RATING_TAGS.carrier:RATING_TAGS.receiver;
  const[stars,setStars]=useState(5);
  const[selTags,setSelTags]=useState([]);
  const[loading,setLoading]=useState(false);
  const toggleTag=t=>setSelTags(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  const submit=async()=>{
    setLoading(true);
    try{await ratingsAPI.submit(deliveryId,{stars,tags:selTags});Toast.show({type:'success',text1:'⭐ Rating submitted!'});
        navigation.reset({index:0,routes:[{name:'Main'}]});}
    catch(e){Toast.show({type:'error',text1:'Failed',text2:e.message});}
    finally{setLoading(false);}
  };
  return (
    <ScrollView style={{flex:1,backgroundColor:COLORS.bg}} contentContainerStyle={{padding:24}}>
      <View style={{alignItems:'center',paddingVertical:32}}>
        <Text style={{fontSize:64,marginBottom:12}}>🎉</Text>
        <Text style={{fontSize:26,fontWeight:'800',color:COLORS.text,textAlign:'center'}}>{isRecv?'Parcel Delivered!':'₹ Earned!'}</Text>
        <Text style={{color:COLORS.muted,fontSize:14,marginTop:6}}>{isRecv?'Your order arrived safely':'Payment credited to your wallet'}</Text>
      </View>
      <Card style={{marginBottom:16}}>
        <View style={{alignItems:'center',marginBottom:14}}>
          <Avatar name={other?.fullName||'?'} size={60}/>
          <Text style={{fontSize:18,fontWeight:'800',marginTop:10}}>{other?.fullName}</Text>
          <Text style={{color:COLORS.muted,fontSize:13,marginTop:4}}>{isRecv?'Your Carrier':'The Receiver'}</Text>
        </View>
        <Text style={{textAlign:'center',color:COLORS.muted,fontSize:13,marginBottom:14}}>How was your experience?</Text>
        <View style={{flexDirection:'row',justifyContent:'center',gap:8,marginBottom:8}}>
          {[1,2,3,4,5].map(i=><TouchableOpacity key={i} onPress={()=>setStars(i)}><Text style={{fontSize:40,color:i<=stars?'#FFD166':'#DDD'}}>★</Text></TouchableOpacity>)}
        </View>
        <Text style={{textAlign:'center',color:COLORS.muted,fontSize:13,marginBottom:16}}>{stars===5?'Excellent 🌟':stars===4?'Good 😊':stars===3?'Average 😐':stars===2?'Poor 😕':'Terrible 😞'}</Text>
        <Text style={{fontWeight:'700',color:COLORS.muted,fontSize:13,marginBottom:10}}>What went well?</Text>
        <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
          {tags.map(t=><TouchableOpacity key={t} onPress={()=>toggleTag(t)}
            style={{borderWidth:1.5,borderRadius:20,paddingHorizontal:14,paddingVertical:7,
                     borderColor:selTags.includes(t)?COLORS.brand:COLORS.border,
                     backgroundColor:selTags.includes(t)?COLORS.orangeBg:'#fff'}}>
            <Text style={{fontSize:13,color:selTags.includes(t)?COLORS.brand:COLORS.text}}>{t}</Text>
          </TouchableOpacity>)}
        </View>
      </Card>
      <Button label="Submit Rating ⭐" onPress={submit} loading={loading}/>
      <Button label="Skip" variant="ghost" onPress={()=>navigation.reset({index:0,routes:[{name:'Main'}]})} style={{marginTop:8}}/>
    </ScrollView>
  );
}

// ── DISPUTE ───────────────────────────────────────────────────────────────────
function DisputeScreen({ route, navigation }) {
  const{deliveryId}=route.params;
  const[reason,setReason]=useState('');
  const[desc,setDesc]=useState('');
  const[loading,setLoading]=useState(false);
  const REASONS=[{key:'not_received',label:'📭 Parcel Not Received'},{key:'damaged',label:'💔 Parcel Damaged'},
    {key:'wrong_item',label:'🔄 Wrong Item'},{key:'carrier_missing',label:'🚫 Carrier Unreachable'},
    {key:'otp_issue',label:'🔑 OTP Problem'},{key:'other',label:'❓ Other'}];
  const submit=async()=>{
    if(!reason||!desc) return Toast.show({type:'error',text1:'Fill in all fields'});
    setLoading(true);
    try{await deliveryAPI.raiseDispute(deliveryId,{reason,description:desc});
        Toast.show({type:'success',text1:'⚖️ Dispute Raised',text2:'Our team reviews within 24 hours.'});
        navigation.navigate('Main');}
    catch(e){Toast.show({type:'error',text1:'Failed',text2:e.message});}
    finally{setLoading(false);}
  };
  return (
    <View style={{flex:1,backgroundColor:COLORS.bg}}>
      <ScreenHeader title="Report an Issue" subtitle="Admin reviews within 24 hours" onBack={()=>navigation.goBack()}/>
      <ScrollView contentContainerStyle={{padding:16}}>
        <View style={{backgroundColor:'#FEF3C7',borderRadius:12,padding:12,marginBottom:20}}>
          <Text style={{color:'#92400e',fontSize:13,lineHeight:20}}>⚠️ Raising a dispute freezes payments until resolved. Use only for genuine problems.</Text>
        </View>
        <SectionLabel>SELECT REASON</SectionLabel>
        {REASONS.map(r=>(
          <TouchableOpacity key={r.key} onPress={()=>setReason(r.key)}
            style={{borderWidth:1.5,borderRadius:14,padding:14,marginBottom:10,position:'relative',
                     borderColor:reason===r.key?COLORS.brand:COLORS.border,
                     backgroundColor:reason===r.key?COLORS.orangeBg:'#fff'}}>
            <Text style={{fontWeight:'700',fontSize:14,color:COLORS.text}}>{r.label}</Text>
            {reason===r.key&&<View style={{position:'absolute',top:12,right:12,width:22,height:22,borderRadius:11,
              backgroundColor:COLORS.brand,alignItems:'center',justifyContent:'center'}}><Text style={{color:'#fff',fontSize:12}}>✓</Text></View>}
          </TouchableOpacity>
        ))}
        <Input label="Describe the Issue" placeholder="Give as much detail as possible..." value={desc} onChangeText={setDesc} multiline numberOfLines={5} autoCapitalize="sentences" style={{marginTop:8}}/>
        <Button label="Submit Dispute ⚖️" onPress={submit} loading={loading} style={{marginBottom:32}}/>
      </ScrollView>
    </View>
  );
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
const TAB_OPTS={headerShown:false,tabBarShowLabel:false,tabBarStyle:{height:68,paddingBottom:8,paddingTop:4,borderTopWidth:1,borderTopColor:COLORS.border,backgroundColor:'#fff',elevation:8}};
const TI=({emoji,label,focused})=><View style={{alignItems:'center',gap:2}}><Text style={{fontSize:22,opacity:focused?1:0.45}}>{emoji}</Text><Text style={{fontSize:10,fontWeight:focused?'700':'400',color:focused?COLORS.brand:COLORS.muted}}>{label}</Text></View>;

function ReceiverTabs() {
  return <Tab.Navigator screenOptions={TAB_OPTS}>
    <Tab.Screen name="Home"         component={ReceiverHomeScreen}  options={{tabBarIcon:p=><TI emoji="🏠" label="Home"    {...p}/>}}/>
    <Tab.Screen name="PostDelivery" component={PostDeliveryScreen}  options={{tabBarIcon:p=><TI emoji="📦" label="New"     {...p}/>}}/>
    <Tab.Screen name="MyDeliveries" component={MyDeliveriesScreen}  options={{tabBarIcon:p=><TI emoji="📋" label="Orders"  {...p}/>}}/>
    <Tab.Screen name="Wallet"       component={WalletScreen}        options={{tabBarIcon:p=><TI emoji="💰" label="Wallet"  {...p}/>}}/>
    <Tab.Screen name="Profile"      component={ProfileScreen}       options={{tabBarIcon:p=><TI emoji="👤" label="Profile" {...p}/>}}/>
  </Tab.Navigator>;
}

function CarrierTabs() {
  return <Tab.Navigator screenOptions={TAB_OPTS}>
    <Tab.Screen name="Home"         component={CarrierHomeScreen}  options={{tabBarIcon:p=><TI emoji="🏠" label="Home"     {...p}/>}}/>
    <Tab.Screen name="MyDeliveries" component={MyDeliveriesScreen} options={{tabBarIcon:p=><TI emoji="📋" label="History"  {...p}/>}}/>
    <Tab.Screen name="Wallet"       component={WalletScreen}       options={{tabBarIcon:p=><TI emoji="💰" label="Earnings" {...p}/>}}/>
    <Tab.Screen name="Profile"      component={ProfileScreen}      options={{tabBarIcon:p=><TI emoji="👤" label="Profile"  {...p}/>}}/>
  </Tab.Navigator>;
}

function MainStack() {
  const user=useAuthStore(s=>s.user);
  return <Stack.Navigator screenOptions={{headerShown:false}}>
    <Stack.Screen name="Main" component={user?.activeRole==='carrier'?CarrierTabs:ReceiverTabs}/>
    <Stack.Screen name="Track"        component={TrackDeliveryScreen}/>
    <Stack.Screen name="Chat"         component={ChatScreen}/>
    <Stack.Screen name="Rate"         component={RateDeliveryScreen}/>
    <Stack.Screen name="KYC"          component={KYCScreen}/>
    <Stack.Screen name="Dispute"      component={DisputeScreen}/>
    <Stack.Screen name="MyDeliveries" component={MyDeliveriesScreen}/>
  </Stack.Navigator>;
}

function AuthStack() {
  return <Stack.Navigator screenOptions={{headerShown:false}}>
    <Stack.Screen name="Login"    component={LoginScreen}/>
    <Stack.Screen name="Register" component={RegisterScreen}/>
    <Stack.Screen name="KYC"      component={KYCScreen}/>
  </Stack.Navigator>;
}

export default function AppNavigator() {
  const{isLoggedIn,isLoading,init}=useAuthStore();
  useEffect(()=>{init();},[]);
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isLoading?<LoadingScreen message="Starting CampusRelay..."/>:isLoggedIn?<MainStack/>:<AuthStack/>}
      </NavigationContainer>
      <Toast/>
    </SafeAreaProvider>
  );
}
