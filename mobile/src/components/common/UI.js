import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';

export const Button = ({ label, onPress, variant='primary', loading, disabled, style, icon, size='md' }) => {
  const bg = variant==='primary'?COLORS.brand:variant==='success'?COLORS.green:variant==='danger'?COLORS.red:'transparent';
  const border = variant==='ghost'?COLORS.brand:variant==='ghostRed'?COLORS.red:'transparent';
  const fg = (variant==='primary'||variant==='success'||variant==='danger')?'#fff':variant==='ghostRed'?COLORS.red:COLORS.brand;
  const pad = size==='sm'?{paddingVertical:9,paddingHorizontal:14}:{paddingVertical:15,paddingHorizontal:20};
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled||loading} activeOpacity={0.82}
      style={[{borderRadius:14,alignItems:'center',justifyContent:'center',flexDirection:'row',
               backgroundColor:bg,borderColor:border,borderWidth:variant.startsWith('ghost')?1.5:0},
              pad,(disabled||loading)&&{opacity:0.55},style]}>
      {loading ? <ActivityIndicator color={fg} size="small" />
               : <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                   {icon&&<Text style={{fontSize:size==='sm'?14:16}}>{icon}</Text>}
                   <Text style={{color:fg,fontWeight:'700',fontSize:size==='sm'?13:15,letterSpacing:0.2}}>{label}</Text>
                 </View>}
    </TouchableOpacity>
  );
};

export const Input = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType,
                         multiline, numberOfLines=4, error, icon, style, autoCapitalize='none',
                         editable=true, ...rest }) => (
  <View style={[{marginBottom:14},style]}>
    {label&&<Text style={{fontSize:11,fontWeight:'800',color:COLORS.muted,letterSpacing:0.7,
                           textTransform:'uppercase',marginBottom:6}}>{label}</Text>}
    <View style={[{flexDirection:'row',alignItems:'center',backgroundColor:editable?'#fff':COLORS.bg,
                   borderRadius:13,borderWidth:1.5,borderColor:error?COLORS.red:COLORS.border,
                   paddingHorizontal:14,paddingVertical:Platform.OS==='ios'?13:9}]}>
      {icon&&<Text style={{fontSize:17,marginRight:8}}>{icon}</Text>}
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={COLORS.muted} secureTextEntry={secureTextEntry}
        keyboardType={keyboardType} multiline={multiline} autoCapitalize={autoCapitalize}
        editable={editable}
        style={[{flex:1,fontSize:15,color:COLORS.text},
                multiline&&{height:numberOfLines*22,textAlignVertical:'top'}]}
        {...rest} />
    </View>
    {error&&<Text style={{color:COLORS.red,fontSize:11,marginTop:4}}>{error}</Text>}
  </View>
);

export const Card = ({ children, style, urgent, onPress }) => {
  const c = (
    <View style={[{backgroundColor:'#fff',borderRadius:16,padding:16,marginBottom:12,
                   borderWidth:1,borderColor:COLORS.border,
                   shadowColor:'#000',shadowOpacity:0.04,shadowRadius:6,elevation:2},
                  urgent&&{borderLeftWidth:4,borderLeftColor:COLORS.brand,backgroundColor:'#FFFAF8'},style]}>
      {children}
    </View>
  );
  return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.88}>{c}</TouchableOpacity> : c;
};

export const HeroHeader = ({ children }) => (
  <LinearGradient colors={[COLORS.brandDark,'#2D2D4E']} style={{padding:20,paddingBottom:28,overflow:'hidden',position:'relative'}}>
    <View style={{position:'absolute',right:-50,top:-50,width:180,height:180,borderRadius:90,backgroundColor:'rgba(255,90,31,0.15)'}}/>
    {children}
  </LinearGradient>
);

export const ScreenHeader = ({ title, subtitle, onBack, right }) => (
  <LinearGradient colors={[COLORS.brandDark,'#2D2D4E']} style={{paddingHorizontal:20,paddingTop:18,paddingBottom:22}}>
    <View style={{flexDirection:'row',alignItems:'center'}}>
      {onBack&&<TouchableOpacity onPress={onBack} style={{marginRight:12,padding:4}}>
        <Text style={{color:'#fff',fontSize:24,lineHeight:28}}>←</Text>
      </TouchableOpacity>}
      <View style={{flex:1}}>
        <Text style={{color:'#fff',fontSize:22,fontWeight:'800'}}>{title}</Text>
        {subtitle&&<Text style={{color:'rgba(255,255,255,0.55)',fontSize:13,marginTop:3}}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  </LinearGradient>
);

export const Avatar = ({ name='?', size=44, bg=COLORS.orangeBg, color=COLORS.brand }) => {
  const l = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <View style={{width:size,height:size,borderRadius:size*0.28,backgroundColor:bg,alignItems:'center',justifyContent:'center'}}>
      <Text style={{color,fontSize:size*0.35,fontWeight:'800'}}>{l}</Text>
    </View>
  );
};

export const Chip = ({ label, color='orange', onPress, selected }) => {
  const map={orange:[COLORS.orangeBg,COLORS.brand],green:[COLORS.greenBg,COLORS.green],
             blue:[COLORS.blueBg,COLORS.blue],gray:['#F3F3F5',COLORS.muted],red:['#FEF2F2',COLORS.red]};
  const [bg,fg]=map[color]||map.gray;
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress} activeOpacity={0.75}
      style={{backgroundColor:selected?fg:bg,borderRadius:20,paddingHorizontal:10,paddingVertical:4}}>
      <Text style={{color:selected?'#fff':fg,fontSize:11,fontWeight:'700'}}>{label}</Text>
    </TouchableOpacity>
  );
};

export const Stars = ({ rating=0, size=14, interactive, onRate }) => (
  <View style={{flexDirection:'row',gap:2}}>
    {[1,2,3,4,5].map(i=>(
      <TouchableOpacity key={i} disabled={!interactive} onPress={()=>onRate?.(i)}>
        <Text style={{fontSize:size,color:i<=Math.round(rating)?'#FFD166':'#DDD'}}>★</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const LiveDot = ({ color=COLORS.green, size=8 }) => (
  <View style={{width:size,height:size,borderRadius:size/2,backgroundColor:color}}/>
);

export const Divider = ({ style }) => (
  <View style={[{height:1,backgroundColor:COLORS.border,marginVertical:10},style]}/>
);

export const SectionLabel = ({ children, style }) => (
  <Text style={[{fontSize:11,fontWeight:'800',color:COLORS.muted,letterSpacing:0.9,
                  textTransform:'uppercase',marginBottom:10},style]}>{children}</Text>
);

export const EmptyState = ({ emoji='📭', title, subtitle, action }) => (
  <View style={{flex:1,alignItems:'center',justifyContent:'center',padding:40,minHeight:280}}>
    <Text style={{fontSize:52,marginBottom:14}}>{emoji}</Text>
    <Text style={{fontSize:18,fontWeight:'800',textAlign:'center',color:COLORS.text}}>{title}</Text>
    {subtitle&&<Text style={{fontSize:13,color:COLORS.muted,textAlign:'center',marginTop:8,lineHeight:20}}>{subtitle}</Text>}
    {action&&<View style={{marginTop:20}}>{action}</View>}
  </View>
);

export const LoadingScreen = ({ message='Loading...' }) => (
  <View style={{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.bg}}>
    <ActivityIndicator size="large" color={COLORS.brand}/>
    <Text style={{marginTop:14,color:COLORS.muted,fontSize:14}}>{message}</Text>
  </View>
);

export const OtpInput = ({ value='', onChange, length=4 }) => {
  const refs=React.useRef([]);
  const digits=value.split('');
  const handleChange=(txt,i)=>{
    const next=[...digits]; next[i]=txt.replace(/\D/g,'').slice(-1); onChange(next.join(''));
    if(txt&&i<length-1) refs.current[i+1]?.focus();
  };
  const handleKey=(e,i)=>{ if(e.nativeEvent.key==='Backspace'&&!digits[i]&&i>0) refs.current[i-1]?.focus(); };
  return (
    <View style={{flexDirection:'row',justifyContent:'center',gap:12,marginVertical:20}}>
      {Array.from({length}).map((_,i)=>(
        <TextInput key={i} ref={r=>refs.current[i]=r} value={digits[i]||''}
          onChangeText={t=>handleChange(t,i)} onKeyPress={e=>handleKey(e,i)}
          keyboardType="number-pad" maxLength={1}
          style={{width:58,height:66,borderRadius:14,textAlign:'center',fontSize:26,fontWeight:'800',
                  color:COLORS.text,borderWidth:digits[i]?2:1.5,
                  borderColor:digits[i]?COLORS.brand:COLORS.border,backgroundColor:'#fff'}}/>
      ))}
    </View>
  );
};

export const SimpleMap = ({ style, carrierLat }) => (
  <View style={[{backgroundColor:'#D4ECD4',borderRadius:16,overflow:'hidden',height:180,
                  alignItems:'center',justifyContent:'center'},style]}>
    {[0,1,2,3].map(i=><View key={`h${i}`} style={{position:'absolute',left:0,right:0,top:`${25*i}%`,height:1,backgroundColor:'rgba(0,0,0,0.05)'}}/>)}
    {[0,1,2,3].map(i=><View key={`v${i}`} style={{position:'absolute',top:0,bottom:0,left:`${25*i}%`,width:1,backgroundColor:'rgba(0,0,0,0.05)'}}/>)}
    <View style={{position:'absolute',top:'18%',left:'18%',alignItems:'center'}}>
      <View style={{backgroundColor:COLORS.brandDark,borderRadius:20,width:38,height:38,alignItems:'center',justifyContent:'center'}}>
        <Text style={{fontSize:18}}>🏫</Text>
      </View>
      <Text style={{fontSize:10,color:COLORS.brandDark,fontWeight:'700',marginTop:2}}>Main Gate</Text>
    </View>
    {carrierLat&&(
      <View style={{position:'absolute',bottom:'28%',right:'22%',alignItems:'center'}}>
        <View style={{backgroundColor:COLORS.brand,borderRadius:22,width:44,height:44,alignItems:'center',
                       justifyContent:'center',shadowColor:COLORS.brand,shadowOpacity:0.5,shadowRadius:8,elevation:6}}>
          <Text style={{fontSize:22}}>🛵</Text>
        </View>
        <Text style={{fontSize:10,color:COLORS.brand,fontWeight:'700',marginTop:2}}>Carrier</Text>
      </View>
    )}
    <View style={{position:'absolute',bottom:'12%',right:'12%'}}>
      <View style={{backgroundColor:COLORS.green,borderRadius:16,width:34,height:34,alignItems:'center',justifyContent:'center'}}>
        <Text style={{fontSize:18}}>🏠</Text>
      </View>
    </View>
    {!carrierLat&&(
      <Text style={{color:'#4a7a4a',fontSize:12,fontWeight:'600',opacity:0.7}}>
        Waiting for carrier location...
      </Text>
    )}
  </View>
);

export const Toggle = ({ value, onValueChange, label, sublabel }) => (
  <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <View style={{flex:1}}>
      {label&&<Text style={{fontSize:15,fontWeight:'700',color:COLORS.text}}>{label}</Text>}
      {sublabel&&<Text style={{fontSize:12,color:COLORS.muted,marginTop:2}}>{sublabel}</Text>}
    </View>
    <TouchableOpacity onPress={()=>onValueChange(!value)} activeOpacity={0.8}
      style={{width:50,height:28,borderRadius:14,backgroundColor:value?COLORS.green:COLORS.border,
               justifyContent:'center',paddingHorizontal:3}}>
      <View style={{width:22,height:22,borderRadius:11,backgroundColor:'#fff',
                     marginLeft:value?22:0,
                     shadowColor:'#000',shadowOpacity:0.2,shadowRadius:3,elevation:2}}/>
    </TouchableOpacity>
  </View>
);
