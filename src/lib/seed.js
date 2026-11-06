import { dateKey } from "./utils.js";
import { DAILY } from "./constants.js";

export function buildDemoSeed(){
  const now=new Date();const dk=d=>dateKey(d);const at=(d,h,m)=>{const x=new Date(d);x.setHours(h,m,0,0);return x.getTime()};
  const work=[];const d=new Date();d.setDate(d.getDate()-1);while(work.length<6){if(d.getDay()!==0)work.push(new Date(d));d.setDate(d.getDate()-1)}
  const seg=(day,pairs)=>pairs.map(([a,b],i)=>({in:at(day,a[0],a[1]),out:b?at(day,b[0],b[1]):null,end:i===pairs.length-1?"out":"pause"}));
  const days={};
  work.forEach((day,i)=>{const k=dk(day);const e={};
    e.exlan=i===2?seg(day,[[[9,0],[13,0]],[[13,30],[18,30]]]):seg(day,[[[9,0],[13,0]],[[13,45],[18,0]]]);
    if(i%2===0)e.exminh=i===0?seg(day,[[[14,0],null]]):seg(day,[[[14,0],[18,0]]]);
    e.exhoa=seg(day,[[[10,0],[14,0]],[[14,30],[17,0]]]);
    days[k]={date:k,month:k.slice(0,7),entries:e,log:[],example:true}});
  if(now.getHours()>=10){const k=dk(now);days[k]={date:k,month:k.slice(0,7),entries:{exlan:seg(now,[[[9,0],null]])},log:[],example:true}}
  const ago=n=>{const x=new Date();x.setDate(x.getDate()-n);return dk(x)};const ahead=n=>{const x=new Date();x.setDate(x.getDate()+n);return dk(x)};
  const hygiene={};for(let i=1;i<=13;i++){const k=ago(i);const items={};DAILY.forEach(([key],j)=>{if(!(i===3&&j>5)&&!(i===8&&j>7))items[key]={at:at(new Date(k),18,0),by:"exlan"}});hygiene[k]={date:k,items,example:true}}
  hygiene[dk(now)]={date:dk(now),items:{flaechen:{at:at(now,9,10),by:"exlan"},haende:{at:at(now,9,10),by:"exlan"},vorrat:{at:at(now,9,5),by:"exhoa"},absaugung:{at:at(now,9,5),by:"exhoa"}},example:true};
  const ok=(date)=>({status:"yes",date:date||"",note:"Ví dụ"});
  return {
    settings:{main:{salonName:"Lotus Nails (Demo)",legalName:"Lotus Nails Inh. Nguyễn Thị Mai",street:"Musterstraße 12",zip:"80331",city:"München",land:"Bayern",serviceType:"nonInvasive",seats:4,ownerName:"Nguyễn Thị Mai (Ví dụ)",phone:"089 1234567",email:"kontakt@lotus-nails-demo.de",deputy:"Nguyễn Thị Lan, 0151 0000000",taxName:"Steuerbüro Muster (Ví dụ)",betriebsnummer:"12345678",minWage:13.90,minijobLimit:603,setupDone:true,hasSteri:false}},
    staff:{
      exlan:{id:"exlan",name:"Nguyễn Thị Lan",role:"Quản lý",contract:"Vollzeit",start:"2023-04-01",payType:"month",rate:2600,pin:"1111",idExp:"2029-03-14",permitExp:"2027-08-31",contractExp:"",permitNA:false,hasContract:true,registered:true,active:true,unterweisung:ago(120),feucht:"lt2",vorsorge:"",note:"Ví dụ",example:true},
      exminh:{id:"exminh",name:"Trần Văn Minh",role:"Thợ nails",contract:"Minijob",start:ago(60),payType:"hour",rate:13.90,pin:"2222",idExp:ahead(26),permitExp:"2028-01-15",contractExp:ahead(130),permitNA:false,hasContract:true,registered:false,active:true,unterweisung:"",feucht:"2to4",vorsorge:"",note:"Ví dụ",example:true},
      exhoa:{id:"exhoa",name:"Phạm Thu Hoa",role:"Thợ nails",contract:"Teilzeit",start:"2024-11-01",payType:"hour",rate:14.50,pin:"3333",idExp:"2030-06-30",permitExp:"",contractExp:"",permitNA:true,hasContract:true,registered:true,active:true,unterweisung:ago(400),feucht:"ge4",vorsorge:ago(350),note:"Ví dụ",example:true}},
    days,hygiene,
    products:{
      exbuild:{id:"exbuild",name:"Builder Gel Clear (Ví dụ)",brand:"Hãng mẫu",cat:"Gel / Builder",inci:"Di-HEMA Trimethylhexyl Dicarbamate, Hydroxypropyl Methacrylate, Isobornyl Methacrylate, Trimethylbenzoyl Diphenylphosphine Oxide, Silica",supplierOk:false,example:true},
      expolish:{id:"expolish",name:"Gel Polish 112 Rosé (Ví dụ)",brand:"Hãng mẫu",cat:"UV-Lack (gel polish)",inci:"Urethane Acrylate, HEMA, Ethyl Trimethylbenzoyl Phenylphosphinate, Hydroxycyclohexyl Phenyl Ketone, CI 77891, CI 15850",supplierOk:true,example:true},
      exprimer:{id:"exprimer",name:"Acid-free Primer (Ví dụ)",brand:"Hãng mẫu",cat:"Primer / Bonder",inci:"",supplierOk:false,example:true}},
    disinfectants:{
      exhand:{id:"exhand",name:"Händedesinfektion (Ví dụ)",maker:"Hãng mẫu",use:"Hände (tay)",listed:"VAH",eff:{bakterizid:true,levurozid:true,bviruzid:true},conc:"nguyên chất, 3 ml",contact:"30 Sek.",opened:ago(30),useMonths:"12",expiry:ahead(560),example:true},
      exflaeche:{id:"exflaeche",name:"Flächendesinfektion Tücher (Ví dụ)",maker:"Hãng mẫu",use:"Flächen (bề mặt)",listed:"VAH",eff:{bakterizid:true,levurozid:true,bviruzid:true},conc:"khăn tẩm sẵn",contact:"1 Min.",opened:ago(15),useMonths:"3",expiry:ahead(400),example:true},
      exinstr:{id:"exinstr",name:"Instrumentenbad (Ví dụ)",maker:"Hãng mẫu",use:"Instrumente (dụng cụ)",listed:"no",eff:{bakterizid:true},conc:"2 %",contact:"",opened:"",useMonths:"",expiry:ahead(230),example:true}},
    safety:{bg:ok("2023-03-20"),gb:{status:"no",date:"",note:""},verbandbuch:ok(),kasten:ok(ago(40)),ersthelfer:ok(ago(800)),sdb:ok(),hautschutz:ok(),absaugung:ok(),hygieneplan:ok(ago(200)),handhyg:ok(),instrument:ok(),sharps:ok(),waesche:ok()},
    courses:{owner:{hyg:{date:"2025-02-10",hours:8,provider:"Hygieneschulung Muster (Ví dụ)",note:""}},exlan:{hyg:{date:"2025-02-10",hours:8,provider:"Hygieneschulung Muster (Ví dụ)",note:""}},exhoa:{hyg:{date:"2024-12-05",hours:4,provider:"",note:""}}},
    support:{exsup:{id:"exsup",area:"bgw",kind:"docs",ref:"gb",topic:"Đánh giá rủi ro bằng văn bản (Gefährdungsbeurteilung)",need:"Tiệm chưa có đánh giá rủi ro bằng văn bản. Cần làm đánh giá rủi ro.",want:"Tư vấn và báo chi phí",people:[],contact:{name:"Nguyễn Thị Mai",phone:"089 1234567",email:""},pref:"Thứ Hai sáng",status:"Đã báo giá",at:now.getTime()-3*864e5}}}}
