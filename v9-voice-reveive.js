const Discord = require("discord.js");
const fs = require('fs');

const client = new Discord.Client();

const config = require('./auth.json');

// make a new stream for each time someone starts to talk
function generateOutputFile(channel, member) {
    // use IDs instead of username cause some people have stupid emojis in their name
    const fileName = `./recordings/${channel.id}-${member.id}-${Date.now()}.pcm`;
    return fs.createWriteStream(fileName);
}

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
                        // this creates a 16-bit signed PCM, stereo 48KHz PCM stream.
                        const audioStream = receiver.createPCMStream(user);
                        // create an output stream so we can dump our data in a file
                        const outputStream = generateOutputFile(voiceChannel, user);
                        // pipe our audio data into the file stream
                        audioStream.pipe(outputStream);
                        outputStream.on("data", console.log);
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