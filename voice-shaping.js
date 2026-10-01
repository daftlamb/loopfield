// Approximate sung-vowel formants in Hz; interpolate in log frequency for smooth morphing.
const formants=[[800,1150,2900],[500,1750,2450],[350,2000,2800],[450,800,2830],[325,700,2530]];
export const vowelNames=['A','E','I','O','U'];
export function vowelFormants(value){
 const x=Math.max(0,Math.min(4,value)),i=Math.floor(x),mix=x-i;
 return formants[i].map((f,k)=>f*((formants[Math.min(4,i+1)][k]/f)**mix));
}
export function vowelLabel(value){const i=Math.floor(value),mix=value-i;return mix<.01||i===4?vowelNames[i]:`${vowelNames[i]}→${vowelNames[i+1]} ${Math.round(mix*100)}%`;}
