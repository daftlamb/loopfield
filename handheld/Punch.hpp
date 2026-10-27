#pragma once
#include <array>
#include <vector>
#include <algorithm>
#include <cmath>
class Punch {
    std::array<std::vector<double>,2> history,repeat,echo;
    std::array<double,4> wet{};std::array<double,2> held{},low{};
    int position=0,repeatPosition=0,repeatLength=1,counter=0,previous=0;
public:
    Punch(){for(auto* bank:{&history,&repeat,&echo})for(auto& channel:*bank)channel.resize(48000);}
    void clear(){for(auto* bank:{&history,&repeat,&echo})for(auto& channel:*bank)std::fill(channel.begin(),channel.end(),0);wet={};held={};low={};position=repeatPosition=counter=previous=0;}
    std::array<double,2> tick(std::array<double,2> input,int mask,double bpm,const std::array<double,4>& amounts=std::array<double,4>{1,1,1,1}){
        if((mask&1)&&!(previous&1)){repeatLength=std::clamp(static_cast<int>(48000*60/bpm/8),64,24000);repeatPosition=0;for(int c=0;c<2;++c)for(int i=0;i<repeatLength;++i)repeat[c][i]=history[c][(position+48000-repeatLength+i)%48000];}
        previous=mask;for(int i=0;i<4;++i)wet[i]+=(((mask&(1<<i))?std::clamp(amounts[i],0.,1.):0.)-wet[i])*.002;
        const int delay=std::clamp(static_cast<int>(48000*60/bpm*.75),1,47999);auto result=input;
        for(int c=0;c<2;++c){history[c][position]=input[c];result[c]+=(repeat[c][repeatPosition]-result[c])*wet[0];if(counter%8==0)held[c]=std::round(std::clamp(result[c]*6.,-1.,1.)*8)/8;result[c]+=(held[c]-result[c])*wet[1]*.85;const double delayed=echo[c][(position+48000-delay)%48000];echo[c][position]=std::clamp(input[c]+delayed*.65,-2.,2.);result[c]+=delayed*wet[2]*.8;low[c]+=(result[c]-low[c])*.045;result[c]+=(low[c]-result[c])*wet[3]*.95;}
        position=(position+1)%48000;repeatPosition=(repeatPosition+1)%repeatLength;counter=(counter+1)%8;return result;
    }
};
