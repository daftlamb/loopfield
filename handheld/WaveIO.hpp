#pragma once
#include <SDL.h>
#include "Engine.hpp"
#include <cstring>

inline std::shared_ptr<SampleData> loadSample(const std::string& file,std::string& error){
    if(file.empty()||file.find('/')!=std::string::npos||file.find('\\')!=std::string::npos){error="INVALID WAV NAME";return {};}
    auto* source=SDL_RWFromFile(("samples/"+file).c_str(),"rb");if(!source){error="WAV NOT FOUND";return {};}
    const auto bytes=SDL_RWsize(source);if(bytes<0||bytes>64*1024*1024){SDL_RWclose(source);error="WAV TOO LARGE / MAX 64MB";return {};}
    SDL_AudioSpec format{};Uint8* raw=nullptr;Uint32 length=0;if(!SDL_LoadWAV_RW(source,1,&format,&raw,&length)){error="WAV DECODE FAILED";return {};}
    const int frameBytes=SDL_AUDIO_BITSIZE(format.format)/8*format.channels;
    if(format.freq<=0||format.channels<1||format.channels>2||frameBytes<=0||length/static_cast<double>(frameBytes)/format.freq>60){SDL_FreeWAV(raw);error="USE MONO/STEREO WAV / MAX 60 SECONDS";return {};}
    SDL_AudioCVT converter{};if(SDL_BuildAudioCVT(&converter,format.format,format.channels,format.freq,AUDIO_F32SYS,2,SR)<0){SDL_FreeWAV(raw);error="WAV FORMAT NOT SUPPORTED";return {};}
    converter.len=static_cast<int>(length);std::vector<Uint8> converted(static_cast<size_t>(length)*converter.len_mult);std::memcpy(converted.data(),raw,length);SDL_FreeWAV(raw);converter.buf=converted.data();
    if(SDL_ConvertAudio(&converter)<0){error="WAV CONVERSION FAILED";return {};}
    const int resultBytes=converter.needed?converter.len_cvt:converter.len;auto sample=std::make_shared<SampleData>();sample->file=file;sample->stereo.resize(resultBytes/(sizeof(float)*2)*2);std::memcpy(sample->stereo.data(),converter.buf,sample->stereo.size()*sizeof(float));
    if(sample->frames()<2){error="WAV IS EMPTY";return {};}
    for(auto& value:sample->stereo)value=std::isfinite(value)?static_cast<float>(clamp(value,-1,1)):0;
    for(size_t x=0;x<sample->waveform.size();++x){const size_t from=x*sample->frames()/sample->waveform.size(),to=std::min(sample->frames(),std::max(from+1,(x+1)*sample->frames()/sample->waveform.size()));float low=0,high=0;for(size_t i=from;i<to;++i){low=std::min(low,std::min(sample->stereo[i*2],sample->stereo[i*2+1]));high=std::max(high,std::max(sample->stereo[i*2],sample->stereo[i*2+1]));}sample->waveform[x]={low,high};}
    return sample;
}

inline void preloadSamples(AudioEngine& engine){
    for(const auto& pattern:engine.project["patterns"])for(const auto& track:pattern)if(track.contains("nativeSample")){
        const auto file=str(track["nativeSample"],"file");if(file.empty()||engine.samples.count(file))continue;size_t used=0;for(const auto& entry:engine.samples)used+=entry.second->stereo.size()*sizeof(float);
        std::string error;auto sample=loadSample(file,error);if(sample&&used+sample->stereo.size()*sizeof(float)<=192*1024*1024)engine.samples[file]=std::move(sample);else std::printf("SAMPLE_MISSING %s %s\n",file.c_str(),error.c_str());
    }
}

inline bool exportSampleRegion(const SampleData& sample,const Json& settings,const std::string& path){
    const auto first=static_cast<size_t>(clamp(get(settings,"start")*SR,0,sample.frames()-1));const auto end=static_cast<size_t>(clamp(get(settings,"end",sample.seconds())*SR,first+1,sample.frames()));const bool reverse=str(settings,"mode").find("reverse")!=std::string::npos;
    std::ofstream out(path,std::ios::binary);if(!out)return false;uint32_t bytes=static_cast<uint32_t>((end-first)*4),riff=bytes+36,fmtSize=16,rate=SR*4,sampleRate=SR;uint16_t format=1,channels=2,align=4,bits=16;
    out.write("RIFF",4);out.write(reinterpret_cast<char*>(&riff),4);out.write("WAVEfmt ",8);out.write(reinterpret_cast<char*>(&fmtSize),4);out.write(reinterpret_cast<char*>(&format),2);out.write(reinterpret_cast<char*>(&channels),2);out.write(reinterpret_cast<char*>(&sampleRate),4);out.write(reinterpret_cast<char*>(&rate),4);out.write(reinterpret_cast<char*>(&align),2);out.write(reinterpret_cast<char*>(&bits),2);out.write("data",4);out.write(reinterpret_cast<char*>(&bytes),4);
    std::array<int16_t,2048> block{};size_t filled=0;for(size_t n=0;n<end-first;++n){const size_t i=reverse?end-1-n:first+n;for(int c=0;c<2;++c)block[filled++]=static_cast<int16_t>(clamp(sample.stereo[i*2+c],-1,1)*32767);if(filled==block.size()){out.write(reinterpret_cast<char*>(block.data()),filled*sizeof(int16_t));filled=0;}}
    if(filled)out.write(reinterpret_cast<char*>(block.data()),filled*sizeof(int16_t));return out.good();
}
