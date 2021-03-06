import React from 'react';
import { Modal, Button, Select } from 'antd';
import SoundMeter from './soundmeter';
import PropTypes from 'prop-types';

const Option = Select.Option;

const closeMediaStream = function (stream) {
    if (!stream) {
        return;
    }
    if (MediaStreamTrack && MediaStreamTrack.prototype && MediaStreamTrack.prototype.stop) {
        var tracks, i, len;

        if (stream.getTracks) {
            tracks = stream.getTracks();
            for (i = 0, len = tracks.length; i < len; i += 1) {
                tracks[i].stop();
            }
        } else {
            tracks = stream.getAudioTracks();
            for (i = 0, len = tracks.length; i < len; i += 1) {
                tracks[i].stop();
            }

            tracks = stream.getVideoTracks();
            for (i = 0, len = tracks.length; i < len; i += 1) {
                tracks[i].stop();
            }
        }
        // Deprecated by the spec, but still in use.
    } else if (typeof stream.stop === 'function') {
        console.log('closeMediaStream() | calling stop() on the MediaStream');
        stream.stop();
    }
}

// Attach a media stream to an element.
const attachMediaStream = function (element, stream) {
    element.srcObject = stream;
};

export default class MediaSettings extends React.Component {

    constructor(props) {
        super(props)
        this.state = {
            visible: false,
            videoDevices: [],
            audioDevices: [],
            audioOutputDevices: [],
            resolution: 'vga',
            bandwidth: '512',
            selectedAudioDevice: "",
            selectedVideoDevice: "",
            audioLevel: 0,
        }

        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            window.audioContext = new AudioContext();
        } catch (e) {
            console.log('Web Audio API not supported.');
        }
    }

    updateInputDevices = () => {
        return new Promise((pResolve, pReject) => {
            let videoDevices = [];
            let audioDevices = [];
            let audioOutputDevices = [];
            navigator.mediaDevices.enumerateDevices()
            .then((devices) => {
                for (let device of devices) {
                    if (device.kind === 'videoinput') {
                        videoDevices.push(device);
                    } else if (device.kind === 'audioinput') {
                        audioDevices.push(device);
                    }else if (device.kind === 'audiooutput'){
                        audioOutputDevices.push(device);
                    }
                }
            }).then(() => {
                let data = { videoDevices, audioDevices, audioOutputDevices};
                pResolve(data);
            });
        });
    }

    componentDidMount() {
        if (window.localStorage) {
            let deviceInfo = localStorage["deviceInfo"];
            console.log("deviceInfo:::" + deviceInfo);
            if (deviceInfo) {
                let info = JSON.parse(deviceInfo);
                this.setState({
                    selectedAudioDevice: info.audioDevice,
                    selectedVideoDevice: info.videoDevice,
                    bandwidth: info.bandwidth,
                    resolution: info.resolution,
                });
            }
        }
        this.updateInputDevices().then((data)=>{
            if (this.state.selectedAudioDevice === "" && data.audioDevices.length > 0) {
                this.state.selectedAudioDevice = data.audioDevices[0].deviceId;
            }
            if (this.state.selectedVideoDevice === "" && data.videoDevices.length > 0) {
                this.state.selectedVideoDevice = data.videoDevices[0].deviceId;
            }
            this.state.videoDevices = data.videoDevices;
            this.state.audioDevices = data.audioDevices;
            this.state.audioOutputDevices = data.audioOutputDevices;

            this.state.audioDevices.map((device, index) => {
                if (this.state.selectedAudioDevice == device.deviceId) {
                    console.log("Selected audioDevice::" + JSON.stringify(device));
                }
            });
            this.state.videoDevices.map((device, index) => {
                if (this.state.selectedVideoDevice == device.deviceId) {
                    console.log("Selected videoDevice::" + JSON.stringify(device));
                }
            });
        });

    }

    soundMeterProcess = () => {
        var val = (window.soundMeter.instant.toFixed(2) * 348) + 1;
        this.setState({ audioLevel: val });
        if (this.state.visible)
            setTimeout(this.soundMeterProcess, 100);
    }

    startPreview = () => {
        if (window.stream) {
            closeMediaStream(window.stream);
        }
        let videoElement = this.refs['previewVideo'];
        let audioSource = this.state.selectedAudioDevice;
        let videoSource = this.state.selectedVideoDevice;
        this.soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
        let soundMeterProcess = this.soundMeterProcess;
        let constraints = {
            audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
            video: { deviceId: videoSource ? { exact: videoSource } : undefined }
        };
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (stream) {
                window.stream = stream; // make stream available to console
                //videoElement.srcObject = stream;
                attachMediaStream(videoElement, stream);
                soundMeter.connectToSource(stream);
                setTimeout(soundMeterProcess, 100);
                // Refresh button list in case labels have become available
                return navigator.mediaDevices.enumerateDevices();
            })
            .then((devces) => { })
            .catch((erro) => { });
    }

    stopPreview = () => {
        if (window.stream) {
            closeMediaStream(window.stream);
        }
    }

    componentWillUnmount() {

    }

    showModal = () => {
        this.setState({
            visible: true,
        });
        setTimeout(this.startPreview, 100);
    }

    handleOk = (e) => {
        console.log(e);
        this.setState({
            visible: false,
        });

        if (window.localStorage) {
            let deviceInfo = {
                audioDevice: this.state.selectedAudioDevice,
                videoDevice: this.state.selectedVideoDevice,
                resolution: this.state.resolution,
                bandwidth: this.state.bandwidth,
            };
            localStorage["deviceInfo"] = JSON.stringify(deviceInfo);
        }
        this.stopPreview();

        if(this.props.onDeviceSelectedChanged !== undefined) {
            this.props.onDeviceSelectedChanged(
                this.state.selectedAudioDevice,
                this.state.selectedVideoDevice,
                this.state.resolution,
                this.state.bandwidth);
        }
    }

    handleCancel = (e) => {
        this.setState({
            visible: false,
        });
        this.stopPreview();
    }

    handleAudioDeviceChange = (e) => {
        this.setState({ selectedAudioDevice: e });
        setTimeout(this.startPreview, 100);
    }

    handleVideoDeviceChange = (e) => {
        this.setState({ selectedVideoDevice: e });
        setTimeout(this.startPreview, 100);
    }

    handleResolutionChange = (e) => {
        this.setState({ resolution: e });
    }

    handleBandWidthChange = (e) => {
        this.setState({ bandwidth: e });
    }

    render() {
        return (
            <div>
                {
                    <Button shape="circle" icon="setting" ghost onClick={this.showModal}/>
                }
                <Modal
                    title='Modify device'
                    visible={this.state.visible}
                    onOk={this.handleOk}
                    onCancel={this.handleCancel}
                    okText='Ok'
                    cancelText='Cancel'>
                    <div className="item">
                        <span className="itemleft">Micphone</span>
                        <div className="itemright">
                            <Select value={this.state.selectedAudioDevice} style={{ width: 350 }} onChange={this.handleAudioDeviceChange}>
                                {
                                    this.state.audioDevices.map((device, index) => {
                                        return (<Option value={device.deviceId} key={device.deviceId}>{device.label}</Option>);
                                    })
                                }
                            </Select>
                            <div ref="progressbar" style={{
                                width: this.state.audioLevel + 'px',
                                height: '10px',
                                backgroundColor: '#8dc63f',
                                marginTop: '20px',
                            }}>
                            </div>
                        </div>
                    </div>
                    <div className="item">
                        <span className="itemleft">Camera</span>
                        <div className="itemright">
                            <Select value={this.state.selectedVideoDevice} style={{ width: 350 }} onChange={this.handleVideoDeviceChange}>
                                {
                                    this.state.videoDevices.map((device, index) => {
                                        return (<Option value={device.deviceId} key={device.deviceId}>{device.label}</Option>);
                                    })
                                }
                            </Select>
                            <div className="videobox">
                                <video id='previewVideo' ref='previewVideo' autoPlay playsInline muted="true" style={{ width: '100%', height: '100%', objectFit: 'contain' }}></video>
                            </div>

                        </div>
                    </div>
                    <div className="item">
                        <span className="itemleft">Quality</span>
                        <div className="itemright">
                            <Select style={{ width: 350 }} value={this.state.resolution} onChange={this.handleResolutionChange}>
                                <Option value="qvga">Fluency(320x180)</Option>
                                <Option value="vga">Standardclear(640x360)</Option>
                                <Option value="shd">Highclear(960x540)</Option>
                                <Option value="hd">Superclear(1280x720)</Option>
                            </Select>
                        </div>
                    </div>
                    <div className="item">
                        <span className="itemleft">Bandwidth</span>
                        <div className="itemright">
                            <Select style={{ width: 350 }} value={this.state.bandwidth} onChange={this.handleBandWidthChange}>
                                <Option value="256">Low(256kbps)</Option>
                                <Option value="512">Medium(512kbps)</Option>
                                <Option value="1024">High(1Mbps)</Option>
                                <Option value="4096">Lan(4Mbps)</Option>
                            </Select>
                        </div>
                    </div>
                </Modal>
            </div>
        );
    }
}


MediaSettings.propTypes = {
    onInputDeviceSelected: PropTypes.func
}