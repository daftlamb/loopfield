#pragma once
#include "json.hpp"
#include "Sample.hpp"
#include "Punch.hpp"
#include <map>
#include <algorithm>
#include <array>
#include <atomic>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <string>
#include <vector>

using Json=nlohmann::json;
constexpr double PI=3.14159265358979323846;
constexpr int SR=48000;
inline double clamp(double x,double a,double b){return std::max(a,std::min(b,x));}
inline double get(const Json& j,const char* key,double fallback=0){auto i=j.find(key);return i!=j.end()&&i->is_number()?i->get<double>():fallback;}
inline bool flag(const Json& j,const char* key){auto i=j.find(key);return i!=j.end()&&i->is_boolean()&&i->get<bool>();}
inline std::string str(const Json& j,const char* key,const char* fallback=""){auto i=j.find(key);return i!=j.end()&&i->is_string()?i->get<std::string>():fallback;}
inline std::string noteName(int n){const char* labels[]={"C","C#","D","D#","E","F","F#","G","G#","A","A#","B"};return std::string(labels[(n%12+12)%12])+std::to_string(n/12-1);}
inline Json readJson(const std::string& path){std::ifstream in(path);if(!in)throw std::runtime_error("Cannot open "+path);Json j;in>>j;return j;}
inline Json normalizeProject(Json p,const Json& defaults){
    if(!p.is_object()||!p.contains("patterns")||!p["patterns"].is_array())return p;
    if(!p.contains("fx"))p["fx"]=defaults["fx"];if(!p.contains("trackFx"))p["trackFx"]=defaults["trackFx"];
    if(!p.contains("playMode"))p["playMode"]="pattern";if(!p.contains("song"))p["song"]=Json::array({{{"pattern",static_cast<int>(get(p,"pattern"))},{"repeats",1}}});if(!p.contains("songLoop"))p["songLoop"]=true;
    for(auto& pattern:p["patterns"])if(pattern.is_array())for(auto& track:pattern)if(track.is_object()){
        if(!track.contains("mod"))track["mod"]=defaults["patterns"][0][0]["mod"];
        if(track.contains("steps")&&track["steps"].is_array())for(auto& step:track["steps"])if(step.is_object()){if(!step.contains("gate"))step["gate"]=0;if(!step.contains("ratchet"))step["ratchet"]=1;}
    }
    return p;
}
inline const std::array<const char*,9> conditions={"always","first","later","1/2","2/2","1/4","2/4","3/4","4/4"};
inline bool validProject(const Json& p){
    if(!p.is_object()||get(p,"version")!=1||!p.contains("patterns")||!p["patterns"].is_array()||p["patterns"].empty()||p["patterns"].size()>16||get(p,"bpm")<40||get(p,"bpm")>220||get(p,"swing")<0||get(p,"swing")>60||get(p,"master")<0||get(p,"master")>1)return false;
    if(get(p,"nativeMasterDb")<-12||get(p,"nativeMasterDb")>12)return false;
    if(!p.contains("pattern")||!p["pattern"].is_number_integer()||get(p,"pattern")<0||get(p,"pattern")>=p["patterns"].size()||!p.contains("trackFx")||!p["trackFx"].is_array()||p["trackFx"].size()!=8||!p.contains("fx")||!p["fx"].is_object())return false;
    for(const auto& pattern:p["patterns"]){if(!pattern.is_array()||pattern.size()!=8)return false;for(const auto& t:pattern){if(get(t,"nativeGain",1)<0||get(t,"nativeGain",1)>2||get(t,"nativeTranspose")<-24||get(t,"nativeTranspose")>24||get(t,"nativeRoot")<0||get(t,"nativeRoot")>11)return false;if(t.contains("nativeTone")){const auto tone=str(t,"nativeTone");if(tone!="pluck"&&tone!="bell"&&tone!="marimba")return false;}const auto route=str(t,"nativeRoute","track+bus"),scale=str(t,"nativeScale","chromatic");if(route!="track+bus"&&route!="bus"&&route!="direct")return false;if(scale!="chromatic"&&scale!="major"&&scale!="minor"&&scale!="dorian"&&scale!="pentatonic")return false;if(!t.contains("mod")||!t["mod"].is_object()||!t["mod"].contains("lfos")||!t["mod"]["lfos"].is_array()||t["mod"]["lfos"].size()!=2||!t["mod"].contains("arp")||!t["mod"]["arp"].is_object())return false;for(const auto& l:t["mod"]["lfos"]){if(!l.contains("points")||!l["points"].is_array()||l["points"].size()!=16||!l.contains("routes")||!l["routes"].is_array()||l["routes"].size()>6||get(l,"rate",4)<=0||get(l,"hz",1)<=0)return false;for(const auto& point:l["points"])if(!point.is_number()||point.get<double>()<0||point.get<double>()>1)return false;}if(get(t["mod"]["arp"],"rate",32)<=0)return false;if(t.contains("nativeSample")){const auto& sample=t["nativeSample"];if(!sample.is_object()||!sample.contains("enabled")||!sample["enabled"].is_boolean()||!sample.contains("file")||!sample["file"].is_string()||get(sample,"start")<0||get(sample,"end",1)<=get(sample,"start")||get(sample,"end",1)>60||get(sample,"root",60)<24||get(sample,"root",60)>96||get(sample,"gain",1)<0||get(sample,"gain",1)>4||get(sample,"slices",1)<1||get(sample,"slices",1)>32)return false;if(get(sample,"walkMask")<0||get(sample,"walkMask")>4294967295.||get(sample,"walkChance",35)<0||get(sample,"walkChance",35)>100)return false;const auto walk=str(sample,"walk","off");if(walk!="off"&&walk!="slow"&&walk!="active")return false;const auto mode=str(sample,"mode","one-shot");if(mode!="one-shot"&&mode!="loop"&&mode!="reverse"&&mode!="reverse-loop")return false;}if(!t.contains("steps")||!t["steps"].is_array()||t["steps"].size()!=32)return false;for(const auto& s:t["steps"]){const auto condition=str(s,"condition","always");if(std::find(conditions.begin(),conditions.end(),condition)==conditions.end())return false;if(get(s,"note")<24||get(s,"note")>96||get(s,"velocity")<.05||get(s,"velocity")>1||get(s,"probability")<0||get(s,"probability")>1||get(s,"ratchet",1)<1||get(s,"ratchet",1)>8||get(s,"gate")<0||get(s,"gate")>400||get(s,"slice")<0||get(s,"slice")>32)return false;}}}
    if(!p.contains("song")||!p["song"].is_array()||p["song"].empty()||p["song"].size()>32)return false;
    for(const auto& r:p["song"])if(get(r,"pattern")<0||get(r,"pattern")>=p["patterns"].size()||get(r,"repeats",1)<1||get(r,"repeats",1)>8)return false;
    return true;
}

inline bool conditionMatches(const std::string& condition,uint64_t round){if(condition=="always")return true;if(condition=="first")return round==1;if(condition=="later")return round>1;return (round-1)%static_cast<unsigned>(condition[2]-'0')==static_cast<unsigned>(condition[0]-'1');}
inline int walkSlice(int anchor,int count,const std::string& mode,int& position,uint32_t& state,uint32_t mask=0,double chance=-1){
    std::array<int,32> allowed{};int size=0;for(int i=1;i<=count;++i)if(!mask||(mask&(1u<<(i-1))))allowed[size++]=i;if(!size)allowed[size++]=1;
    int index=0;const int target=position>0?position:anchor;for(int i=1;i<size;++i)if(std::abs(allowed[i]-target)<std::abs(allowed[index]-target))index=i;
    if(position<1||size<2){position=allowed[index];return position;}position=allowed[index];
    auto next=[&]{state=state*1664525u+1013904223u;return state/4294967296.;};const double probability=chance<0?(mode=="slow"?.35:1):clamp(chance,0,1);if(probability<1&&next()>=probability)return position;
    const int direction=next()<.5?-1:1,distance=std::min(size-1,mode=="active"&&next()>.75?2:1);int value=index+direction*distance;if(value<0||value>=size)value=index-direction*distance;position=allowed[std::clamp(value,0,size-1)];return position;
}
inline double lfoValue(const Json& l,double time,double start,double bpm){
    const double cycles=(flag(l,"retrigger")?std::max(0.,time-start):time)*(flag(l,"sync")?bpm/60/get(l,"rate",4):get(l,"hz",1));
    const double x=(cycles-std::floor(cycles))*16;const int i=static_cast<int>(x);if(!l.contains("points")||l["points"].size()!=16)return .5;
    const double a=l["points"][i].get<double>(),b=l["points"][(i+1)%16].get<double>();return flag(l,"smooth")?a+(b-a)*(x-i):a;
}
inline double modValue(const Json& mod,const std::string& target,double base,double time,double start,double bpm){
    if(!mod.contains("lfos"))return base;double value=base;
    for(const auto& l:mod["lfos"])if(flag(l,"enabled")&&l.contains("routes"))for(const auto& r:l["routes"])if(str(r,"target")==target){const double from=get(r,"from"),to=get(r,"to");value=from+(to-from)*lfoValue(l,time,start,bpm);}
    return value;
}

inline int pitchNote(int note,const Json& track){
    int value=std::clamp(note+static_cast<int>(get(track,"nativeTranspose")),0,127);const auto scale=str(track,"nativeScale","chromatic");if(scale=="chromatic")return value;
    const std::vector<int> notes=scale=="major"?std::vector<int>{0,2,4,5,7,9,11}:scale=="minor"?std::vector<int>{0,2,3,5,7,8,10}:scale=="dorian"?std::vector<int>{0,2,3,5,7,9,10}:std::vector<int>{0,2,4,7,9};const int root=static_cast<int>(get(track,"nativeRoot"));int best=value,distance=128;for(int n=0;n<128;++n)if(std::find(notes.begin(),notes.end(),(n-root+120)%12)!=notes.end()&&std::abs(n-value)<distance){distance=std::abs(n-value);best=n;}return best;
}
struct Tone {int kind=0;double volume=.48,attack=.006,decay=.2,cutoff=6500,q=.7,fm=0,ratio=2,pan=0,pitch=0;};
inline int kindIndex(const std::string& s){const char* names[]={"fm","triangle","sine","square","sawtooth","kick","snare","hat","noise","sample","pluck","bell","marimba"};for(int i=0;i<13;++i)if(s==names[i])return i;return 0;}
inline Tone toneFor(const Json& t,double time,double start,double bpm){
    Tone r;r.kind=t.contains("nativeSample")&&flag(t["nativeSample"],"enabled")?9:kindIndex(str(t,"nativeTone",str(t,"kind","fm").c_str()));const Json empty=Json::object();const auto& mod=t.contains("mod")?t["mod"]:empty;
    r.volume=clamp(modValue(mod,"volume",get(t,"volume",.48),time,start,bpm),0,1);r.attack=clamp(modValue(mod,"attack",get(t,"attack",.006),time,start,bpm),.002,1);r.decay=clamp(modValue(mod,"decay",get(t,"decay",.2),time,start,bpm),.03,2);
    r.cutoff=clamp(modValue(mod,"cutoff",get(t,"cutoff",6500),time,start,bpm),80,18000);r.q=clamp(modValue(mod,"resonance",get(t,"resonance",.7),time,start,bpm),.1,12);r.fm=clamp(modValue(mod,"fm",get(t,"fm"),time,start,bpm),0,8);r.ratio=clamp(modValue(mod,"ratio",get(t,"ratio",2),time,start,bpm),.5,8);r.pan=clamp(modValue(mod,"pan",get(t,"pan"),time,start,bpm),-1,1);r.pitch=modValue(mod,"pitch",0,time,start,bpm);return r;
}

struct FxParams {bool crush=false,chorus=false,delay=false,reverb=false,compress=false;std::array<double,8> combGain{};double crushMix=0,bits=6,drive=4,chorusMix=0,rate=.8,depth=3,delayMix=0,time=.3,feedback=.35,reverbMix=0,decay=1.8,threshold=-24,ratio=4,makeup=3;};
inline FxParams fxFor(const Json& j,const Json& mod,double time,double start,double bpm){
    FxParams p;auto section=[&](const char* id)->Json{return j.contains(id)?j[id]:Json::object();};
    auto value=[&](const Json& s,const char* id,const char* key,double base){return modValue(mod,std::string(id)+"."+key,get(s,key,base),time,start,bpm);};
    auto c=section("crusher");p.crush=flag(c,"enabled");p.crushMix=clamp(value(c,"crusher","mix",.6),0,1);p.bits=get(c,"bits",6);p.drive=value(c,"crusher","drive",4);
    c=section("chorus");p.chorus=flag(c,"enabled");p.chorusMix=clamp(value(c,"chorus","mix",.35),0,1);p.rate=value(c,"chorus","rate",.8);p.depth=value(c,"chorus","depth",3);
    c=section("delay");p.delay=flag(c,"enabled");p.delayMix=clamp(value(c,"delay","mix",.25),0,1);p.time=clamp(value(c,"delay","time",.3),.05,.8);p.feedback=clamp(value(c,"delay","feedback",.35),0,.7);
    c=section("reverb");p.reverb=flag(c,"enabled");p.reverbMix=clamp(value(c,"reverb","mix",.25),0,1);p.decay=get(c,"decay",1.8);if(p.reverb)for(int i=0;i<8;++i)p.combGain[i]=std::pow(.001,(.0297+i*.00413)/std::max(.2,p.decay));
    c=section("compressor");p.compress=flag(c,"enabled");p.threshold=value(c,"compressor","threshold",-24);p.ratio=clamp(value(c,"compressor","ratio",4),1,20);p.makeup=value(c,"compressor","makeup",3);return p;
}
class Effects {
    std::array<std::vector<float>,2> delays,choruses;std::array<std::vector<float>,8> combs;
    size_t dpos=0,cpos=0;std::array<size_t,8> rpos{};double phase=0,envelope=0;
public:
    Effects(){for(auto& d:delays)d.assign(SR,0);for(auto& c:choruses)c.assign(2048,0);for(int i=0;i<8;++i)combs[i].assign(static_cast<int>(SR*(.0297+i*.00413)),0);}
    void clear(){for(auto& d:delays)std::fill(d.begin(),d.end(),0);for(auto& c:choruses)std::fill(c.begin(),c.end(),0);for(auto& r:combs)std::fill(r.begin(),r.end(),0);dpos=cpos=0;rpos={};envelope=0;}
    std::array<double,2> tick(std::array<double,2> v,const FxParams& p){
        if(p.crush){const double levels=std::pow(2,p.bits-1);for(auto& x:v)x=x*(1-p.crushMix)+std::round(clamp(x*p.drive,-1,1)*levels)/levels*p.crushMix;}
        if(p.chorus){phase+=p.rate/SR;phase-=std::floor(phase);for(int c=0;c<2;++c){const double offset=clamp((.016+(c?1:-1)*p.depth*.001*std::sin(2*PI*phase))*SR,1,2046);const double index=cpos+2048-offset;const size_t a=static_cast<size_t>(index)%2048;const double f=index-std::floor(index),wet=choruses[c][a]*(1-f)+choruses[c][(a+1)%2048]*f;choruses[c][cpos]=v[c];v[c]=v[c]*(1-p.chorusMix)+wet*p.chorusMix;}cpos=(cpos+1)%2048;}
        if(p.delay){const int offset=static_cast<int>(p.time*SR);for(int c=0;c<2;++c){const double wet=delays[c][(dpos+SR-offset)%SR];delays[c][dpos]=static_cast<float>(clamp(v[c]+wet*p.feedback,-3,3));v[c]=v[c]*(1-p.delayMix)+wet*p.delayMix;}dpos=(dpos+1)%SR;}
        if(p.reverb){std::array<double,2> wet{};for(int i=0;i<8;++i){auto& buf=combs[i];const double r=buf[rpos[i]],gain=p.combGain[i];buf[rpos[i]]=static_cast<float>(clamp(v[i%2]+r*gain,-3,3));rpos[i]=(rpos[i]+1)%buf.size();wet[i%2]+=r*.25;}for(int c=0;c<2;++c)v[c]=v[c]*(1-p.reverbMix)+wet[c]*p.reverbMix;}
        if(p.compress){const double x=std::max(std::abs(v[0]),std::abs(v[1]));envelope+=(x-envelope)*(x>envelope?1-std::exp(-1./(SR*.01)):1-std::exp(-1./(SR*.18)));const double db=20*std::log10(std::max(1e-9,envelope)),reduction=std::max(0.,db-p.threshold)*(1-1/p.ratio),gain=std::pow(10,(p.makeup-reduction)/20);for(auto& s:v)s*=gain;}
        return v;
    }
};
struct Filter {double b0=1,b1=0,b2=0,a1=0,a2=0,z1=0,z2=0;void setup(int kind,double hz,double q){double w=2*PI*hz/SR,co=std::cos(w),si=std::sin(w),alpha=si/(2*q),a0=1+alpha;a1=-2*co/a0;a2=(1-alpha)/a0;if(kind==7){b0=(1+co)*.5/a0;b1=-(1+co)/a0;b2=b0;}else if(kind==6){b0=alpha/a0;b1=0;b2=-b0;}else {b0=(1-co)*.5/a0;b1=(1-co)/a0;b2=b0;}}double tick(double in){const double out=b0*in+z1;z1=b1*in-a1*out+z2;z2=b2*in-a2*out;return out;}};
struct Voice {bool active=false,chip=false;int track=0,note=60;int64_t born=0,root=0,end=0,gate=0,attack=0,rootToken=0;double velocity=.7,phase=0,modPhase=0,noisePhase=0,amp=1,decay=0,frequency=440,modIncrement=0,panL=.7,panR=.7,fmGain=0,fmDecay=1,envDecay=1,kickRatio=3;std::array<double,4> modeSin{},modeCos{1,1,1,1},stepSin{},stepCos{},modeAmp{1,.45,.2,.1},modeDecay{};Filter filter,filterR;Tone tone;std::shared_ptr<SampleData> sample;double position=0,first=0,last=0,rate=1,sampleGain=1;int rootNote=60;bool reverse=false,loop=false;};
struct Event {bool active=false;int track=0,note=60,rootToken=0,slice=0;int64_t at=0,root=0;double velocity=.7,gate=-1,attack=.006,decay=.2;bool chip=false;};

class AudioEngine {
    std::array<Voice,128> voices{};std::vector<Event> events;std::array<int,8> tokens{};std::array<double,8> triggerTimes{};std::array<Tone,8> tones{};std::array<FxParams,9> fxParams{};std::array<Effects,9> effects;
    std::array<float,SR*2> noise{};uint32_t randomState=42;std::array<std::array<int,8>,16> walkPositions{};std::array<std::array<uint32_t,8>,16> walkStates{};int64_t clock=0;double nextStep=0;int controlCounter=0,songRepeat=0;double smoothedMaster=0;double mixerGain=1;bool masterBypass=false;std::array<double,8> gains{};std::array<int,8> routes{};std::array<bool,8> audible{};Punch punch;
    double random(){randomState=randomState*1664525u+1013904223u;return randomState/4294967296.;}
    void enqueue(Event e){if(events.size()<1024){e.active=true;events.push_back(e);}}
    void updateVoice(Voice& v){v.tone=tones[v.track];const auto& t=v.tone;const auto& track=project["patterns"][activePattern][v.track];const int played=t.kind>=5&&t.kind<=8?v.note+static_cast<int>(get(track,"nativeTranspose")):pitchNote(v.note,track);v.frequency=440*std::pow(2.,(played+t.pitch-69)/12.);v.modIncrement=v.frequency*t.ratio/SR;v.panL=std::cos((t.pan+1)*PI*.25);v.panR=std::sin((t.pan+1)*PI*.25);v.envDecay=std::exp(-8./(SR*std::max(.001,v.decay)));v.fmDecay=std::exp(-2.12/(SR*std::max(.01,v.decay)));v.fmGain=t.fm*std::exp(-2.12*(clock-v.born)/(SR*std::max(.01,v.decay)));v.filter.setup(t.kind,t.kind==7?6500:t.kind==6?2200:t.cutoff,t.q);v.filterR.setup(9,t.cutoff,t.q);v.rate=std::pow(2.,(played+t.pitch-v.rootNote)/12.);if(t.kind>=10){const double ratios[3][4]={{1,2,3,4},{1,2.71,4.11,5.43},{1,4,10,14.37}};for(int i=0;i<4;++i){const double frequency=v.frequency*ratios[t.kind-10][i]*(i?t.ratio/2:1);v.stepSin[i]=frequency<SR*.45?std::sin(2*PI*frequency/SR):0;v.stepCos[i]=frequency<SR*.45?std::cos(2*PI*frequency/SR):0;v.modeDecay[i]=std::exp(-(t.kind==12?6:t.kind==11?.4:1.4)*i/(SR*std::max(.03,v.decay)));}}}
    void beginVoice(const Event& e){
        if(e.rootToken!=tokens[e.track])return;
        tones[e.track]=toneFor(project["patterns"][activePattern][e.track],clock/static_cast<double>(SR),triggerTimes[e.track],get(project,"bpm",96));
        if(e.chip){for(auto& v:voices)if(v.active&&v.chip&&v.track==e.track&&v.rootToken==e.rootToken){v.note=e.note;updateVoice(v);return;}}
        Voice* slot=nullptr;for(auto& v:voices)if(!v.active){slot=&v;break;}if(!slot)slot=&*std::min_element(voices.begin(),voices.end(),[](const auto& a,const auto& b){return a.born<b.born;});
        *slot={};slot->active=true;slot->track=e.track;slot->note=e.note;slot->velocity=e.velocity;slot->born=clock;slot->root=e.root;slot->rootToken=e.rootToken;slot->chip=e.chip;
        const bool drum=tones[e.track].kind>=5&&tones[e.track].kind<=8;slot->attack=static_cast<int64_t>(std::max(.0002,drum?.002:e.attack)*SR);slot->gate=e.gate<0?-1:static_cast<int64_t>(e.gate*SR);slot->decay=e.gate<0?e.decay:std::min(e.decay,.08);slot->end=slot->born+(slot->gate<0?slot->attack:slot->gate)+static_cast<int64_t>((slot->decay+.012)*SR);if(tones[e.track].kind>=10){const int kind=tones[e.track].kind;slot->attack=static_cast<int64_t>(e.attack*SR);slot->decay=e.gate<0?e.decay*(kind==11?5:kind==12?2.5:2):std::min(e.decay,.08);slot->end=slot->born+(slot->gate<0?slot->attack:slot->gate)+static_cast<int64_t>((slot->decay+.012)*SR);slot->modeAmp=kind==11?std::array<double,4>{1,.6,.35,.2}:kind==12?std::array<double,4>{1,.55,.12,.05}:std::array<double,4>{1,.45,.2,.1};}updateVoice(*slot);
        if(tones[e.track].kind==9){
            const auto& settings=project["patterns"][activePattern][e.track]["nativeSample"];auto found=samples.find(str(settings,"file"));if(found==samples.end()){slot->active=false;return;}slot->sample=found->second;lastSlices[e.track]=e.slice;
            slot->first=clamp(get(settings,"start")*SR,0,slot->sample->frames()-1);slot->last=clamp(get(settings,"end",slot->sample->seconds())*SR,slot->first+1,slot->sample->frames());const int count=std::clamp(static_cast<int>(get(settings,"slices",1)),1,32);if(e.slice>0&&count>1){const double first=slot->first,length=(slot->last-first)/count;const int index=std::clamp(e.slice,1,count)-1;slot->first=std::floor(first+index*length);slot->last=std::min(static_cast<double>(slot->sample->frames()),std::max(slot->first+1,std::floor(first+(index+1)*length)));}slot->rootNote=static_cast<int>(get(settings,"root",60));slot->sampleGain=clamp(get(settings,"gain",1),0,4)*2;const auto mode=str(settings,"mode","one-shot");slot->reverse=mode.find("reverse")!=std::string::npos;slot->loop=mode.find("loop")!=std::string::npos;slot->position=slot->reverse?slot->last-1:slot->first;updateVoice(*slot);
            if(slot->gate<0){slot->gate=slot->loop?static_cast<int64_t>(60/get(project,"bpm",96)/4*SR):INT64_MAX/4;slot->end=slot->loop?slot->born+slot->gate+static_cast<int64_t>(slot->decay*SR):INT64_MAX/2;}
        }
    }
    void trigger(int t,int index,double duration){
        auto& tr=project["patterns"][activePattern][t];const auto& s=tr["steps"][index];if(!flag(s,"on")||!conditionMatches(str(s,"condition","always"),patternPasses[activePattern])||random()>=get(s,"probability",1))return;
        bool solo=false;for(const auto& track:project["patterns"][activePattern])solo|=flag(track,"solo");if(flag(tr,"mute")||(solo&&!flag(tr,"solo")))return;
        int slice=static_cast<int>(get(s,"slice"));if(tr.contains("nativeSample")&&flag(tr["nativeSample"],"enabled")){const auto& sample=tr["nativeSample"];const auto mode=str(sample,"walk","off");if(mode!="off"){auto& state=walkStates[activePattern][t];if(!state)state=7919*(activePattern+1)+104729*(t+1);slice=walkSlice(slice,static_cast<int>(get(sample,"slices",1)),mode,walkPositions[activePattern][t],state,static_cast<uint32_t>(get(sample,"walkMask")),get(sample,"walkChance",mode=="slow"?35:100)/100);}else walkPositions[activePattern][t]=0;}
        const int token=++tokens[t];events.erase(std::remove_if(events.begin(),events.end(),[t](const auto& e){return e.track==t;}),events.end());for(auto& v:voices)if(v.track==t&&v.chip)v.active=false;
        triggerTimes[t]=clock/static_cast<double>(SR);const auto tone=toneFor(tr,triggerTimes[t],triggerTimes[t],get(project,"bpm",96));const int ratchet=static_cast<int>(get(s,"ratchet",1));const double spacing=duration/ratchet;
        const Json empty=Json::object();const auto& mod=tr.contains("mod")?tr["mod"]:empty;const auto& arp=mod.contains("arp")?mod["arp"]:empty;
        for(int r=0;r<ratchet;++r){const double at=triggerTimes[t]+spacing*r;const double percent=modValue(mod,"gate",get(s,"gate"),at,at,get(project,"bpm",96)),gate=percent>0?spacing*percent/100:-1;
            Event base;base.slice=slice;base.track=t;base.note=static_cast<int>(get(s,"note",60));base.rootToken=token;base.at=clock+static_cast<int64_t>(spacing*r*SR);base.root=base.at;base.velocity=get(s,"velocity",.75);base.gate=gate;base.attack=ratchet==1?tone.attack:std::min(tone.attack,spacing*.15);base.decay=ratchet==1?tone.decay:std::min(tone.decay,spacing*.65);
            if(!flag(arp,"enabled")||(tone.kind>=5&&tone.kind<=8)){enqueue(base);continue;}
            std::vector<int> chord;const auto type=str(arp,"chord","major");if(type=="custom"&&arp.contains("custom"))for(const auto& n:arp["custom"])chord.push_back(n.get<int>());else if(type=="minor")chord={0,3,7};else if(type=="seventh")chord={0,4,7,10};else if(type=="minor7")chord={0,3,7,10};else if(type=="octave")chord={0,12};else if(type=="fifth")chord={0,7,12};else chord={0,4,7};
            std::vector<int> notes;for(int oct=0;oct<get(arp,"octaves",1);++oct)for(int n:chord)notes.push_back(n+oct*12);if(notes.empty())notes={0};const auto order=str(arp,"order","up");if(order=="down")std::reverse(notes.begin(),notes.end());if(order=="bounce"&&notes.size()>2){auto copy=notes;for(int i=static_cast<int>(copy.size())-2;i>0;--i)notes.push_back(copy[i]);}
            double length=std::max(.005,gate<0?base.attack+base.decay:gate);if(r<ratchet-1)length=std::min(length,spacing);const double interval=60/get(project,"bpm",96)*4/get(arp,"rate",32)*(flag(arp,"triplet")?2./3:1);
            for(int i=0;i*interval<length-.00001&&i<256;++i){auto e=base;const int k=order=="random"?std::min(static_cast<int>(notes.size())-1,static_cast<int>(random()*notes.size())):i%notes.size();e.note=std::clamp(base.note+notes[k],0,127);e.at+=static_cast<int64_t>(i*interval*SR);e.chip=str(arp,"style")=="chip";e.gate=e.chip?length:std::min(interval,length-i*interval)*.8;enqueue(e);}
        }
    }
    void advance(){
        if(playStep==0){if(str(project,"playMode")=="song"){auto& song=project["song"];songRow=std::min(songRow,static_cast<int>(song.size())-1);activePattern=static_cast<int>(get(song[songRow],"pattern"));}else if(pendingPattern>=0){activePattern=pendingPattern;pendingPattern=-1;}++patternPasses[activePattern];}
        const double duration=60/get(project,"bpm",96)/4*(1+(playStep%2?-1:1)*get(project,"swing")/100);
        for(int t=0;t<8;++t)trigger(t,playStep,duration);visibleStep=playStep;nextStep+=duration*SR;playStep=(playStep+1)%32;
        if(playStep==0&&str(project,"playMode")=="song"){auto& song=project["song"];if(++songRepeat>=get(song[songRow],"repeats",1)){songRepeat=0;if(++songRow>=static_cast<int>(song.size())){if(flag(project,"songLoop"))songRow=0;else {songRow=static_cast<int>(song.size())-1;naturalEnd=true;}}}}
    }
    void refresh(){
        const Json empty=Json::object();const double time=clock/static_cast<double>(SR),bpm=get(project,"bpm",96);
        bool solo=false;for(const auto& tr:project["patterns"][activePattern])solo|=flag(tr,"solo");mixerGain=std::pow(10.,clamp(get(project,"nativeMasterDb"),-12,12)/20);masterBypass=flag(project,"nativeMasterBypass");
        for(int t=0;t<8;++t){const auto& tr=project["patterns"][activePattern][t];gains[t]=clamp(get(tr,"nativeGain",1),0,2);const auto route=str(tr,"nativeRoute","track+bus");routes[t]=route=="direct"?2:route=="bus"?1:0;audible[t]=!flag(tr,"mute")&&(!solo||flag(tr,"solo"));tones[t]=toneFor(tr,time,triggerTimes[t],bpm);const auto& mod=tr.contains("mod")?tr["mod"]:empty;fxParams[t]=fxFor(project["trackFx"][t],mod,time,triggerTimes[t],bpm);}
        fxParams[8]=fxFor(project["fx"],empty,time,0,bpm);
        for(auto& v:voices)if(v.active)updateVoice(v);
    }
public:
    Json project;
    std::array<uint64_t,16> patternPasses{};std::array<int,8> lastSlices{};
    int punchMask=0;std::array<double,4> punchAmounts{.75,.75,.75,.75};std::array<double,8> meters{};
    std::map<std::string,std::shared_ptr<SampleData>> samples;
    void clearTrack(int track){for(auto& row:walkPositions)row[track]=0;for(auto& v:voices)if(v.track==track)v={};events.erase(std::remove_if(events.begin(),events.end(),[track](const auto& event){return event.track==track;}),events.end());}
    double samplePosition(int track)const{for(const auto& v:voices)if(v.active&&v.track==track&&v.sample)return v.position/v.sample->frames();return -1;}
    bool playing=false,naturalEnd=false;int playStep=0,visibleStep=-1,activePattern=0,pendingPattern=-1,songRow=0;
    uint64_t rendered=0,triggers=0;double peak=0,outputGain=1;
    AudioEngine(Json p):project(std::move(p)){events.reserve(1024);for(auto& n:noise)n=static_cast<float>(random()*2-1);activePattern=static_cast<int>(get(project,"pattern"));refresh();}
    void resetAudio(){voices={};events.clear();tokens={};punchMask=0;punch.clear();meters={};for(auto& f:effects)f.clear();peak=0;}
    void start(){resetAudio();walkPositions={};walkStates={};patternPasses={};lastSlices={};clock=0;nextStep=0;playStep=0;visibleStep=-1;songRow=0;songRepeat=0;naturalEnd=false;playing=true;activePattern=static_cast<int>(get(project,"pattern"));refresh();}
    void stop(){playing=false;visibleStep=-1;resetAudio();}
    void preview(int t,int step){activePattern=static_cast<int>(get(project,"pattern"));auto tr=project["patterns"][activePattern][t];auto& s=tr["steps"][step];Event e;e.slice=static_cast<int>(get(s,"slice"));e.track=t;e.note=static_cast<int>(get(s,"note",60));e.velocity=get(s,"velocity",.75);e.rootToken=tokens[t];e.at=e.root=clock;e.attack=get(tr,"attack",.006);e.decay=get(tr,"decay",.2);e.gate=get(s,"gate")>0?60/get(project,"bpm",96)/4*get(s,"gate")/100:-1;triggerTimes[t]=clock/static_cast<double>(SR);refresh();beginVoice(e);}
    void queuePattern(int p){project["pattern"]=p;if(playing&&str(project,"playMode")!="song")pendingPattern=p;else if(!playing){activePattern=p;refresh();}}
    void render(int16_t* output,int count){
        for(int n=0;n<count;++n){if(playing&&clock>=nextStep){if(naturalEnd)playing=false;else advance();}if((controlCounter++%128)==0)refresh();for(size_t i=0;i<events.size();){if(events[i].at<=clock){beginVoice(events[i]);events[i]=events.back();events.pop_back();++triggers;}else ++i;}
            std::array<std::array<double,2>,8> buses{};
            for(auto& v:voices)if(v.active){if(clock>=v.end){v.active=false;continue;}const auto& t=v.tone;const double age=(clock-v.born)/static_cast<double>(SR),hz=v.frequency;double frequency=hz,env=0;const int64_t samples=clock-v.born,release=v.gate<0?v.attack:v.gate;
                if(samples<v.attack)env=static_cast<double>(samples)/std::max<int64_t>(1,v.attack);else if(samples<release)env=1;else {v.amp*=v.envDecay;env=v.amp;}env*=v.velocity*.32;
                if(v.sample){
                    if(v.position<v.first||v.position>=v.last){if(v.loop){const double length=v.last-v.first;v.position=v.first+std::fmod(std::fmod(v.position-v.first,length)+length,length);}else {v.active=false;continue;}}
                    const size_t a=static_cast<size_t>(v.position),b=std::min(a+1,static_cast<size_t>(v.last)-1);const double fraction=v.position-a;
                    const double edge=std::min(1.,std::min(v.position-v.first,v.last-1-v.position)/96.);for(int channel=0;channel<2;++channel){const double value=(v.sample->stereo[a*2+channel]*(1-fraction)+v.sample->stereo[b*2+channel]*fraction)*env*t.volume*v.sampleGain*std::max(0.,edge);buses[v.track][channel]+=(channel?v.filterR:v.filter).tick(value)*(channel?v.panR:v.panL);}v.position+=(v.reverse?-1:1)*v.rate;continue;
                }
                if(t.kind==5){frequency=hz*v.kickRatio;v.kickRatio=std::max(.65,v.kickRatio*.99964610);}
                const double mod=t.kind<5&&t.fm>0?std::sin(v.modPhase*2*PI):0;v.modPhase+=v.modIncrement;v.modPhase-=std::floor(v.modPhase);const double fm=v.fmGain;v.fmGain*=v.fmDecay;v.phase+=(frequency+(t.kind<5?hz*fm*mod:0))/SR;v.phase-=std::floor(v.phase);
                double sample=t.kind==0||t.kind==2||t.kind==5?std::sin(v.phase*2*PI):0;if(t.kind==1)sample=1-4*std::abs(v.phase-.5);if(t.kind==3)sample=v.phase<.5?1:-1;if(t.kind==4)sample=2*v.phase-1;
                if(t.kind>=6&&t.kind<=8){v.noisePhase+=hz/261.6255653;v.noisePhase=std::fmod(v.noisePhase,noise.size());sample=noise[static_cast<size_t>(v.noisePhase)];if(t.kind==6)sample+=.5*(1-4*std::abs(std::fmod(age*180,1.)-.5));}
                if(t.kind>=10){sample=0;for(int i=0;i<4;++i){const double next=v.modeSin[i]*v.stepCos[i]+v.modeCos[i]*v.stepSin[i];v.modeCos[i]=v.modeCos[i]*v.stepCos[i]-v.modeSin[i]*v.stepSin[i];v.modeSin[i]=next;v.modeAmp[i]*=v.modeDecay[i];sample+=next*v.modeAmp[i]*(i?.3+t.fm*.25:1);}sample*=.65;if(t.kind!=11&&age<.012){v.noisePhase=std::fmod(v.noisePhase+1,noise.size());sample+=noise[static_cast<size_t>(v.noisePhase)]*.2*(1-age/.012);}}
                sample=v.filter.tick(sample*env*t.volume);buses[v.track][0]+=sample*v.panL;buses[v.track][1]+=sample*v.panR;
            }
            std::array<double,2> mixed{},direct{};for(int t=0;t<8;++t){auto effected=effects[t].tick(routes[t]==0?buses[t]:std::array<double,2>{},fxParams[t]);auto out=routes[t]==0?effected:buses[t];for(auto& value:out)value*=audible[t]?gains[t]:0;meters[t]=std::max(meters[t]*.9999,std::max(std::abs(out[0]),std::abs(out[1])));auto& destination=routes[t]==2?direct:mixed;for(int c=0;c<2;++c)destination[c]+=out[c];}auto bus=effects[8].tick(masterBypass?std::array<double,2>{}:mixed,fxParams[8]);if(!masterBypass)mixed=bus;for(int c=0;c<2;++c)mixed[c]+=direct[c];mixed=punch.tick(mixed,punchMask,get(project,"bpm",96),punchAmounts);smoothedMaster+=(get(project,"master",.58)*.65*mixerGain-smoothedMaster)*.001;
            for(int c=0;c<2;++c){double s=mixed[c]*smoothedMaster*outputGain;if(!std::isfinite(s)){s=0;}s=std::tanh(s);peak=std::max(peak,std::abs(s));output[n*2+c]=static_cast<int16_t>(s*32767);}++clock;++rendered;
        }
    }
};
