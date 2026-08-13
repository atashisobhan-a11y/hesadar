import React, {useEffect, useMemo, useState} from "react";
import {SafeAreaView, View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";

const initial = {
  transactions: [],
  people: {},
  products: {}
};

function money(n){ return new Intl.NumberFormat("fa-IR").format(Number(n)||0) + " تومان"; }

function parseText(text){
  const t=text.replace(/,/g,"").replace(/،/g," ");
  const nums=(t.match(/\d+(?:\.\d+)?/g)||[]).map(Number);
  const lower=t.toLowerCase();
  const isBuy=/خریدم|خرید|گرفتم|از .* گرفتم/.test(t);
  const isSell=/فروختم|فروش|دادم به|به .* دادم/.test(t);
  const isPay=/پرداخت کردم|دادم|تسویه کردم|واریز کردم|کارت به کارت کردم/.test(t);
  const isReceive=/گرفتم|دریافت کردم|واریز شد|پرداخت کرد/.test(t);
  let type=isBuy?"خرید":isSell?"فروش":isPay?"پرداخت":isReceive?"دریافت":"نامشخص";
  const person=(t.match(/(?:از|به|برای)\s+([آ-یA-Za-z0-9_]+(?:\s+[آ-یA-Za-z0-9_]+)?)/)||[])[1]||"نامشخص";
  const product=(t.match(/(?:یه|یک|یک عدد|یک دستگاه)?\s*([A-Za-z0-9آ-ی][A-Za-z0-9آ-ی _-]{2,40}?)(?=\s+(?:از|به|رو|را|دونه|عدد|با|به مبلغ)|$)/)||[])[1]||"کالای نامشخص";
  const amount=nums.length?nums[nums.length-1]:0;
  return {type,person:person.trim(),product:product.trim(),amount,text};
}

export default function App(){
  const [data,setData]=useState(initial);
  const [text,setText]=useState("");
  const [tab,setTab]=useState("home");

  useEffect(()=>{AsyncStorage.getItem("hesabiyar").then(x=>x&&setData(JSON.parse(x)))},[]);
  useEffect(()=>{AsyncStorage.setItem("hesabiyar",JSON.stringify(data))},[data]);

  const totals=useMemo(()=>{
    let buy=0,sell=0;
    data.transactions.forEach(x=>{if(x.type==="خرید")buy+=x.amount;if(x.type==="فروش")sell+=x.amount});
    return {buy,sell,profit:sell-buy};
  },[data]);

  function save(){
    if(!text.trim()) return;
    const p=parseText(text);
    const tx={...p,id:Date.now(),date:new Date().toLocaleDateString("fa-IR")};
    setData(d=>({
      ...d,
      transactions:[tx,...d.transactions],
      people:{...d.people,[p.person]:(d.people[p.person]||0)+(p.type==="خرید"?p.amount:p.type==="فروش"?-p.amount:0)},
      products:{...d.products,[p.product]:(d.products[p.product]||0)+(p.type==="خرید"?1:p.type==="فروش"?-1:0)}
    }));
    setText("");
    Alert.alert("ثبت شد",`${p.type}\n${p.product}\nطرف حساب: ${p.person}\nمبلغ: ${money(p.amount)}\n\nتوجه: برای اعداد و حساب‌های حساس، قبل از ثبت نهایی آن‌ها را بررسی کن.`);
  }

  function voice(){
    Alert.alert("ثبت صوتی", "نسخه نهایی باید ورودی صوتی فارسی را از سرویس تشخیص گفتار/AI دریافت کند. در این نسخه می‌توانی متن را وارد کنی. Fastshot می‌تواند قابلیت صوتی را در مرحله Build به پروژه اضافه کند.");
  }

  return <SafeAreaView style={s.root}>
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.title}>حسابیار فروشگاه</Text>
      {tab==="home" && <>
        <View style={s.cards}>
          <View style={s.card}><Text>فروش</Text><Text style={s.big}>{money(totals.sell)}</Text></View>
          <View style={s.card}><Text>خرید</Text><Text style={s.big}>{money(totals.buy)}</Text></View>
          <View style={s.card}><Text>سود تقریبی</Text><Text style={s.big}>{money(totals.profit)}</Text></View>
        </View>
        <Pressable style={s.voice} onPress={voice}><Text style={s.voiceText}>🎙️ ثبت با صدا</Text></Pressable>
        <TextInput style={s.input} value={text} onChangeText={setText} placeholder="مثلاً: یک RTX 4060 از رضا خریدم 28 میلیون" multiline/>
        <Pressable style={s.primary} onPress={save}><Text style={s.primaryText}>ثبت معامله</Text></Pressable>
        <Text style={s.section}>آخرین معاملات</Text>
        {data.transactions.slice(0,8).map(x=><View style={s.row} key={x.id}><Text>{x.type} — {x.product}</Text><Text>{x.person} — {money(x.amount)}</Text></View>)}
      </>}
      {tab==="people" && <><Text style={s.section}>حساب اشخاص</Text>{Object.entries(data.people).map(([p,v])=><View style={s.row} key={p}><Text style={{fontWeight:"700"}}>{p}</Text><Text>{v>0?`بدهی شما: ${money(v)}`:`طلب شما: ${money(-v)}`}</Text></View>)}</>}
      {tab==="products" && <><Text style={s.section}>موجودی کالا</Text>{Object.entries(data.products).map(([p,v])=><View style={s.row} key={p}><Text>{p}</Text><Text>{v} عدد</Text></View>)}</>}
      {tab==="bank" && <><Text style={s.section}>بانک</Text><Text style={s.note}>اتصال بانکی باید فقط از API رسمی بانک یا سرویس مجاز انجام شود. اپ نباید رمز کارت یا رمز اینترنت‌بانک را ذخیره کند.</Text><Text style={s.note}>در نسخه کامل: تراکنش جدید → «این پول بابت چی بود؟» → اتصال به خرید/فروش/تسویه بعد از تأیید شما.</Text></>}
      <View style={s.nav}>{[["home","خانه"],["people","اشخاص"],["products","کالاها"],["bank","بانک"]].map(([k,l])=><Pressable key={k} onPress={()=>setTab(k)} style={[s.navBtn,tab===k&&s.active]}><Text>{l}</Text></Pressable>)}</View>
    </ScrollView>
  </SafeAreaView>
}
const s=StyleSheet.create({
 root:{flex:1,backgroundColor:"#f6f7fb"},container:{padding:18,paddingBottom:100},
 title:{fontSize:30,fontWeight:"800",textAlign:"center",marginBottom:18},
 cards:{gap:10},card:{backgroundColor:"white",padding:16,borderRadius:16,marginBottom:8},big:{fontSize:20,fontWeight:"800",marginTop:5},
 voice:{backgroundColor:"#111827",padding:18,borderRadius:16,marginTop:18},voiceText:{color:"white",fontSize:20,textAlign:"center",fontWeight:"700"},
 input:{backgroundColor:"white",borderRadius:14,padding:15,minHeight:90,marginTop:12,textAlign:"right"},
 primary:{backgroundColor:"#2563eb",padding:16,borderRadius:14,marginTop:10},primaryText:{color:"white",textAlign:"center",fontSize:17,fontWeight:"700"},
 section:{fontSize:22,fontWeight:"800",marginTop:24,marginBottom:10},row:{backgroundColor:"white",padding:14,borderRadius:12,marginBottom:8,flexDirection:"row",justifyContent:"space-between",gap:8},
 nav:{position:"relative",marginTop:25,flexDirection:"row",justifyContent:"space-between"},navBtn:{padding:12,borderRadius:12},active:{backgroundColor:"#dbeafe"},note:{backgroundColor:"white",padding:16,borderRadius:14,lineHeight:25}
});
