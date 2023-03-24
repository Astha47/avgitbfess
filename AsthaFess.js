const Twit = require('twit');
const fs = require('fs');
const { downloadMedia } = require('./download');
const OAuth  = require('oauth-1.0a');
const { error, Console } = require('console');
function sleep(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

//Mengambil data admin akun twitter

class AsthaFess {
    constructor(props){
        this.T = new Twit({
            consumer_key: props.consumer_key,
            consumer_secret: props.consumer_secret,
            access_token: props.access_token,
            access_token_secret: props.access_token_secret,
        })
        this.triggerword = props.triggerword;
        this.blacklist = props.blacklist;
    }

    //sleep = (time) => new Promise(resolve => setTimeout(resolve, time))
    

    //Mengambil data admin akun twitter
    getadminuserinfo = () => {
        return new Promise((resolve, reject) => {
            this.T.get('account/verify_credentials', {skip_status: true})
            .then(result => {
                const userID = result.data.id_str
                resolve(userID);
            })
            .catch(err => {
                reject(err);
            })
        }) 
    };

    //Mengambil data seluruh isi DM
    getReceivedMessages = (messages, UserId) => {
        return messages.filter(msg => msg.message_create.sender_id != UserId)
    };

    //Memecah kata pada setiap DM
    getEachWord = (message) => {
        let words = [];
        let finalWords = [];
        const separateEnter = message.split('\n');
        separateEnter.forEach(Line => words = [...words, ...Line.split(' ')] );
        words.forEach(word => {
            const splitComma = word.split(',');
            finalWords = [...finalWords,...splitComma];
        })
        //console.log(finalWords, '<<<<< Final wordssss');
        return finalWords
    }

    //Mengambil pesan yang tidak mengandung trigger
    getUnnecessaryMessages = (receivedMessages, trigger) => {
        return receivedMessages.filter(msg => {
            const message = msg.message_create.message_data.text;
            const words = this.getEachWord(message);
            return !trigger.some(word => words.includes(word));
        })
    }

    //Memblacklist kata
    getBlacklist = (receivedMessages, blacklist) => {
        return receivedMessages.filter(msg => {
          const message = msg.message_create.message_data.text;
          const words = this.getEachWord(message);
          return blacklist.some(bannedWord => words.includes(bannedWord));
        });
      }

    removeBlacklist = (receivedMessages, blacklist) => {
        return receivedMessages.filter(msg => {
          const message = msg.message_create.message_data.text;
          const words = this.getEachWord(message);
          return !blacklist.some(bannedWord => words.includes(bannedWord));
        });
      }
    

    //Mengambil pesan yang mengandung trigger
    getTriggerMessage = (receivedMessages, trigger) => {
        return receivedMessages.filter(msg => {
            const message = msg.message_create.message_data.text;
            const words = this.getEachWord(message);
            return trigger.some(word => words.includes(word));
        })
    }

    //Mengambil tipe pesan berdasar trigger
    getDirectMessage = (UserId) => {
        return new Promise((resolve, reject) => {
            this.T.get('direct_messages/events/list', async (error, data) => {
                try {
                    if (!error) {
                        let lastMessage = [];
                        const messages = data.events;
                        const blacklistMessages = this.getBlacklist(messages, this.blacklist)
                        //console.log(blacklistMessages, 'Dapet K word nihhh <<<<<<<<<<<<<<<<<<,')
                        await this.deleteUnnecessaryMessages(blacklistMessages);
                        //await this.sleep(60000);


                        const receivedMessages = this.getReceivedMessages(messages, UserId)
                        const unnecessaryMessages = this.getUnnecessaryMessages(receivedMessages, this.triggerword)
                        const triggerMessages = this.getTriggerMessage(receivedMessages, this.triggerword)
                        const cleanMessages = this.removeBlacklist(triggerMessages, this.blacklist);

                        await this.deleteUnnecessaryMessages(unnecessaryMessages);
                        await this.deleteMoreThan280CharMsgs(cleanMessages);
                        //console.log(JSON.stringify(cleanMessages, null, 3), 'trigger messagesss <<<<<<<<<<<<<<<<<<');

                        if (cleanMessages[0]) {
                            lastMessage = cleanMessages[cleanMessages.length - 1];
                        }

                        //console.log(JSON.stringify(lastMessage, null, 3), 'last messagesss <<<<<<<<<<<<<<<<<<');

                        resolve(lastMessage);
                    } else {
                        reject('error on get direct message!')
                    }    
                } catch (error) {
                    reject (error);
                }
                
            })
        })
    };

    uploadMedia = (filePath, type) => {
        return new Promise ((resolve, reject) => {
            console.log('UPLOADING MEDIA............')
            const b64content = fs.readFileSync(filePath, {encoding: 'base64'});
            if (type === 'photo') {
                this.T.post('media/upload', {media_data: b64content}, (error, data) => {
                    if (!error) {
                        resolve(data)
                        console.log('MEDIA UPLOADED!')
                    } else {
                        reject(error);
                    }
                })
            } else {
                this.T.postMediaChunked({file_path: filePath}, (error, data) => {
                    if (condition) {
                        resolve(data);
                        console.log('MEDIA UPLOADED!')
                    } else {
                        reject(error);
                    }
                })
            }
            
        })
    }

    tweetMessage = (message) => {
        return new Promise(async (resolve, reject) => {
            try {
                const text = message.message_create.message_data.text;
                const attachment = message.message_create.message_data.attachment;
                const payload = {
                    status: text
                };
                if (attachment){
                    const shortUrl = attachment.media.url;
                    payload.status = text.split(shortUrl)[0];
                    const type = attachment.media.type;
                    let mediaUrl = '';
                    if (type === 'animated_gif'){
                        mediaUrl = media.video_info.variants[0].url;
                    } else if (type === 'video') {
                        mediaUrl = media.video_info.variants[0].url.split('?')[0];
                    } else {
                        mediaUrl = attachment.media.media_url;
                    }
                    
                    const splittedUrl = mediaUrl.split('/');
                    const fileName = splittedUrl[splittedUrl.length - 1];
                    console.log(mediaUrl, 'media url<<<<<<<<<<<<<');
                    console.log(fileName, 'media name<<<<<<<<<<<<<');
                    await downloadMedia(mediaUrl, fileName);
                    const uploadedMedia = await this.uploadMedia(fileName, type);
                    console.log(uploadedMedia, 'Uploaded MEDIA <<<<<<<<<<<<<<<<');
                    fs.unlinkSync(fileName);
                    console.log('Media deleted from local');
                    payload.media_ids = [uploadedMedia.media_id_string];

                    
                }
                resolve();
                this.T.post('statuses/update', payload, (error, data) => {
                    if (!error) {
                        console.log(`successfully posting new status with DM id ${message.id}`)
                        resolve({
                            message: `successfully posting new status with DM id ${message.id}`,
                            data
                        })
                    } else {
                        reject(error);
                    }
                })   
            } catch (error) {
                reject(error);
            }
            
        })
    }

    //Menghapus pesan yang tidak memiliki trigger
    deleteUnnecessaryMessages = async (unnecessaryMessages) => {
        if (unnecessaryMessages.length > 3) {
            for (let i = 0; i<3;i++){
                await this.deleteMessage(unnecessaryMessages[i]);
                await this.sleep(2000);
            }
        } else {
            for (const msg of unnecessaryMessages) {
                await this.deleteMessage(msg);
                await this.sleep(2000);
            }
        }
    }

    deleteMoreThan280CharMsgs = async (triggerMessages) => {
        try {
            let moreThan280 = [];
            for (const [i, msg] of triggerMessages.entries()) {
                let text = msg.message_create.message_data.text;
                const attachment = msg.message_create.message_data.attachment;
                if (attachment){
                    const shortUrl = attachment.media.url;
                    text =  text.split(shortUrl)[0];
                }

                if (text.length > 280){
                    console.log(msg, 'dapet nih msg nya!! <<<<<<<<<<<<<<<<<<<<');
                    moreThan280.push(msg);
                    await this.deleteMessage(msg);

                    await this.sleep(2000);
                }

                if ((i+1) === 3) {
                    break;
                }
            }

            for (const msg of moreThan280){
                const idx = triggerMessages.indexOf(msg);
                triggerMessages.splice(idx, 1);
            }
        } catch (error) {
            throw (error)
        }
        
    };


    deleteMessage = (message) => {
        return new Promise((resolve, reject) => {
            this.T.delete('direct_messages/events/destroy', {id: message.id }, (error, data) => {
                if (!error) {
                   const msg = `Message with id: ${message.id} has successfully deleted`
                   console.log(msg);
                   resolve({
                    message: msg,
                    data
                   })
                } else {
                    reject(error);
                }
            })
        })
    }
}

module.exports = { AsthaFess };