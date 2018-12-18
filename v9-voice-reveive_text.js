require('dotenv').config();　// 環境変数の設定(exportしなくてもよくなる)

const Discord = require("discord.js");
const fs = require('fs');

const client = new Discord.Client();
const config = require('./auth.json');

const speech = require('@google-cloud/speech');

const SAMPLE_RATE = 48000;
const speechClient = new speech.v1p1beta1.SpeechClient();
const stt_request ={
    config: {
        encoding: 'LINEAR16', // signed 16bit PCM
        sampleRateHertz: SAMPLE_RATE, // 48kHz
        languageCode: 'ja-jp',
    }
};

client.on('message', msg => {
    if (msg.content.startsWith(config.prefix+'join')) {
        let [command, ...channelName] = msg.content.split(" ");
        if (!msg.guild) {
            return msg.reply('no private service is available in your area at the moment. Please contact a service representative for more details.');
        }
        const voiceChannel = msg.guild.channels.find("name", channelName.join(" "));
        //console.log(voiceChannel.id);
        if (!voiceChannel || voiceChannel.type !== 'voice') {
            return msg.reply(`I couldn't find the channel ${channelName}. Can you spell?`);
        }
        voiceChannel.join()
            .then(conn => {
                msg.reply('ready!');
                // create our voice receiver
                const receiver = conn.createReceiver();

                conn.on('speaking', (user, speaking) => {
                    if (speaking) {
                        msg.channel.sendMessage(`I'm listening to ${user}`);

                        // !! modify Streo to "MONO" !!
                        // this creates a 16-bit signed PCM, "Single" 48KHz PCM stream.
                        const audioStream = receiver.createPCMStream(user);
                        const recognizeStream = speechClient.streamingRecognize(stt_request)
                            .on('error', console.error)
                            .on('data', (data) => {
                                if(data.error === null){
                                    console.log(data);
                                    console.log(data.results[0].alternatives);
                                }
                            });
                        audioStream.pipe(recognizeStream);

                        // when the stream ends (the user stopped talking) tell the user
                        audioStream.on('end', () => {
                            msg.channel.sendMessage(`I'm no longer listening to ${user}`);
                        });
                    }
                });
            })
            .catch(console.log);
    }
    if(msg.content.startsWith(config.prefix+'leave')) {
        let [command, ...channelName] = msg.content.split(" ");
        let voiceChannel = msg.guild.channels.find("name", channelName.join(" "));
        voiceChannel.leave();
    }
});

client.login(config.token);

client.on('ready', () => {
    console.log('ready!');
});