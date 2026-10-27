#pragma once
#include <array>
#include <memory>
#include <string>
#include <vector>

struct SampleData {
    std::string file;
    std::vector<float> stereo;
    std::array<std::array<float,2>,976> waveform{};
    size_t frames() const{return stereo.size()/2;}
    double seconds() const{return frames()/48000.;}
};
