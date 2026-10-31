export type ReservationSelection={date:string;start:number;hours:number;guests:number;extras:{id:string;quantity:number}[]};
export function readReservationSelection(hash:string):ReservationSelection|null{
 try{if(hash.length>12000)return null;const value=new URLSearchParams(hash.replace(/^#/,'' )).get('reserva');if(!value)return null;const d=JSON.parse(value);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d.date)||!Number.isFinite(d.start)||d.start<0||d.start>47.984||!Number.isInteger(d.hours)||d.hours<1||d.hours>24||!Number.isInteger(d.guests)||d.guests<1||d.guests>100000||!Array.isArray(d.extras)||d.extras.length>100)return null;
  if(d.extras.some((x:any)=>typeof x.id!=='string'||x.id.length>64||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>100000))return null;
  return {date:d.date,start:d.start,hours:d.hours,guests:d.guests,extras:d.extras.map((x:any)=>({id:x.id,quantity:x.quantity}))};
 }catch{return null;}
}
export function reservationDestination(url:string,selection:ReservationSelection):string{return url+'#reserva='+encodeURIComponent(JSON.stringify(selection));}
