export const COLORS = {
  brand:'#FF5A1F', brandDark:'#1A1A2E', green:'#06B96F', red:'#E53E3E',
  blue:'#3B82F6', bg:'#F7F5F2', card:'#FFFFFF', text:'#1A1A2E',
  muted:'#7B7B8F', border:'#E8E4DF', orangeBg:'#FFF3EB', greenBg:'#E8FAF3', blueBg:'#EFF6FF',
};

// ⚠️ CHANGE THIS — run ipconfig on your PC, use IPv4 address under WiFi
export const API_BASE_URL = 'http://192.168.1.100:5000/api';
export const SOCKET_URL   = 'http://192.168.1.100:5000';

export const MIN_COMMISSION = 30;
export const PLATFORM_CUT   = 7;

export const DELIVERY_APPS = [
  { key:'zomato',   label:'Zomato',   emoji:'🍕', color:'#CB202D' },
  { key:'blinkit',  label:'Blinkit',  emoji:'⚡', color:'#F8CB2E' },
  { key:'swiggy',   label:'Swiggy',   emoji:'🛵', color:'#FC8019' },
  { key:'amazon',   label:'Amazon',   emoji:'📦', color:'#FF9900' },
  { key:'flipkart', label:'Flipkart', emoji:'🛍️', color:'#2874F0' },
  { key:'other',    label:'Other',    emoji:'📫', color:'#7B7B8F' },
];

export const DELIVERY_STATUS = {
  pending:         { label:'Finding Carrier',  color:'#FF5A1F', bg:'#FFF3EB' },
  accepted:        { label:'Carrier Assigned', color:'#3B82F6', bg:'#EFF6FF' },
  pickup_verified: { label:'Parcel Picked Up', color:'#F59E0B', bg:'#FEF3C7' },
  in_transit:      { label:'On the Way',       color:'#8B5CF6', bg:'#EDE9FE' },
  delivered:       { label:'Delivered ✅',      color:'#06B96F', bg:'#E8FAF3' },
  cancelled:       { label:'Cancelled',        color:'#E53E3E', bg:'#FEF2F2' },
  disputed:        { label:'Disputed ⚠️',       color:'#D97706', bg:'#FFFBEB' },
};

export const RATING_TAGS = {
  carrier:  ['Fast delivery','Careful with parcel','Friendly','On time','Communicated well'],
  receiver: ['Easy to locate','Quick OTP','Polite','Good instructions','Responsive'],
};
