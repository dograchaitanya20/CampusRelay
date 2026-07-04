import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card, Avatar, Stars, Button, Chip } from '../common/UI';
import { COLORS, DELIVERY_APPS, DELIVERY_STATUS } from '../../constants';
import { formatDistanceToNow } from 'date-fns';

export const FeedCard = ({ delivery, onAccept, loading }) => {
  const app  = DELIVERY_APPS.find(a => a.key === delivery.package?.app) || DELIVERY_APPS[5];
  const comm = delivery.commission?.current || 30;
  return (
    <Card urgent={comm >= 45}>
      <View style={{flexDirection:'row',alignItems:'flex-start'}}>
        <View style={{width:48,height:48,borderRadius:14,backgroundColor:app.color+'18',alignItems:'center',justifyContent:'center'}}>
          <Text style={{fontSize:24}}>{app.emoji}</Text>
        </View>
        <View style={{flex:1,marginLeft:10}}>
          <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>{app.label} Order</Text>
          <Text style={{fontSize:12,color:COLORS.muted,marginTop:2}} numberOfLines={1}>{delivery.package?.description}</Text>
        </View>
        <View style={{alignItems:'flex-end'}}>
          <Text style={{fontSize:26,fontWeight:'800',color:COLORS.brand}}>₹{comm}</Text>
          <Text style={{fontSize:10,color:COLORS.muted}}>earn</Text>
          {(delivery.commission?.bumpCount||0)>0&&<Chip label="⬆ Rising" color="orange"/>}
        </View>
      </View>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:10}}>
        <Text style={{fontSize:12,color:COLORS.muted}}>🏠 {delivery.destination?.hostelBlock} · {delivery.destination?.roomNumber}</Text>
        {delivery.window?.from&&(
          <Text style={{fontSize:12,color:COLORS.muted}}>
            ⏰ {new Date(delivery.window.from).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}–{new Date(delivery.window.to).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
          </Text>
        )}
      </View>
      <View style={{flexDirection:'row',alignItems:'center',gap:8,marginTop:8}}>
        <Avatar name={delivery.receiver?.fullName||'?'} size={26}/>
        <Text style={{fontSize:12,color:COLORS.muted}}>{delivery.receiver?.fullName}</Text>
        <Stars rating={delivery.receiver?.rating?.average||0} size={12}/>
        <Text style={{fontSize:11,color:COLORS.muted,marginLeft:'auto'}}>
          {formatDistanceToNow(new Date(delivery.createdAt||Date.now()),{addSuffix:true})}
        </Text>
      </View>
      {comm<50&&(
        <View style={{backgroundColor:COLORS.orangeBg,borderRadius:10,padding:8,marginTop:10}}>
          <Text style={{fontSize:11,color:COLORS.brand,fontWeight:'600'}}>⚡ Commission rises ₹5 in ~5 min if not accepted</Text>
        </View>
      )}
      <Button label={`⚡ Accept — Earn ₹${comm}`} onPress={onAccept} loading={loading} style={{marginTop:12}}/>
    </Card>
  );
};

export const HistoryCard = ({ delivery, role, onPress }) => {
  const app    = DELIVERY_APPS.find(a => a.key === delivery.package?.app) || DELIVERY_APPS[5];
  const stInfo = DELIVERY_STATUS[delivery.status] || {};
  const other  = role==='receiver' ? delivery.carrier : delivery.receiver;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card urgent={['pending','accepted','pickup_verified'].includes(delivery.status)}>
        <View style={{flexDirection:'row',alignItems:'flex-start'}}>
          <View style={{width:42,height:42,borderRadius:12,backgroundColor:app.color+'18',alignItems:'center',justifyContent:'center'}}>
            <Text style={{fontSize:20}}>{app.emoji}</Text>
          </View>
          <View style={{flex:1,marginLeft:10}}>
            <Text style={{fontSize:14,fontWeight:'700',color:COLORS.text}}>{app.label}</Text>
            <Text style={{fontSize:12,color:COLORS.muted,marginTop:2}} numberOfLines={1}>{delivery.package?.description}</Text>
            {other&&<Text style={{fontSize:12,color:COLORS.muted,marginTop:3}}>{role==='receiver'?'🛵':'👤'} {other.fullName||'Unassigned'}</Text>}
          </View>
          <View style={{alignItems:'flex-end',gap:6}}>
            <View style={{backgroundColor:stInfo.bg||'#F3F3F5',borderRadius:20,paddingHorizontal:8,paddingVertical:3}}>
              <Text style={{fontSize:10,fontWeight:'700',color:stInfo.color||COLORS.muted}}>{stInfo.label||delivery.status}</Text>
            </View>
            <Text style={{fontSize:14,fontWeight:'800',color:role==='carrier'?COLORS.green:COLORS.text}}>
              {role==='carrier'?`+₹${delivery.commission?.paid||delivery.commission?.current||30}`:`₹${delivery.commission?.current||30}`}
            </Text>
          </View>
        </View>
        <Text style={{fontSize:11,color:COLORS.muted,marginTop:8}}>
          {formatDistanceToNow(new Date(delivery.createdAt||Date.now()),{addSuffix:true})}
        </Text>
      </Card>
    </TouchableOpacity>
  );
};
