import request from 'superagent'

import SparkClient from 'node-sparky'

import ServiceTemplate from './Template.service'

const agent = require('superagent-promise')(require('superagent'), Promise)

export default class CiscoSparkService extends ServiceTemplate {

  /**
   * Check if the message come from a valid webhook
   */
  static checkSecurity (req, channel) {
	return true
  }

  /**
   * Check if any params is missing
   */
  static checkParamsValidity (channel) {
    const { token } = channel

    if (!token) { throw new ValidationError('token', 'missing') }

    return true
  }

  /**
   * Extract information from the request before the pipeline
   */
  static extractOptions (req) {
  console.log('*************************')
  console.log(req.body)
  console.log('*************************')
    const { body } = req
    return {
      chatId: body.data.roomId,
      senderId: body.data.personId,
    }
  }
  /**
   * send 200 to kik to stop pipeline
   */
  static async beforePipeline (res) {
    return res.status(200).send()
  }

  /**
   * Parse the message to the connector format
   */
  static async parseChannelMessage (conversation, message, opts) {

	const spark = new SparkClient({ token: conversation.channel.token });
	message = await spark.messageGet(message.data.id)
	message.attachment= {
	  type : 'text',
	  value : message.text,
	}
    return [conversation, message, opts]
  }

  /*
  * Parse the message to send it to kik
  */
  static formatMessage (conversation, message, opts) {

	console.log(message)

	const msg = {
	}

    if (message.attachment.type === 'text') {
	  msg.text = message.attachment.content
    } else if (message.attachment.type === 'picture') {
	  msg.files = message.attachment.content
    } else if (message.attachment.type === 'video') {
	  msg.text = message.attachment.content
    } else if (message.attachment.type === 'quickReplies') {
	  msg.text = message.attachment.content
    } else if (message.attachment.type === 'card') {
	  msg.text = message.attachment.content
    } else {
	  msg.text = message.attachment.content
    }

    return msg
  }

  /*
  * Suscribe webhook
  */
  static async onChannelCreate (channel) {
    const data = {
	  'name': channel.slug,
	  'targetUrl': 'https://ebe5594f.ngrok.io' + '/webhook/' + channel._id,
	  'resource': 'all',
	  'event': 'all',
    }

	console.log(data)

 	const spark = new SparkClient({ token: channel.token, webhookUrl : data.targetUrl });
	const [me] = await Promise.all([
	  spark.personMe(),
	  spark.webhookAdd('all', 'all', channel.slug),
	])

	channel.userName = me.id
	channel.save()
  }

  /*
  * Update webhook
  */
  static async onChannelUpdate (channel) {
    await onChannelDelete(channel)
	await onChannelCreate(channel)
  }


  /*
  * Delete webhook
  */
  static async onChannelDelete (channel) {
 	const spark = new SparkClient({ token: channel.token});
	const webhooks = await spark.webhooksGet()
	const webhook = webhooks.find(w => w.name === channel.slug)
	if (!webhook) { return }
	await spark.webhookRemove(webhook.id)
  }

 /**
  * send the message to kik
  */
  static async sendMessage (conversation, message, opts) {
  console.log(message)
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%')
  console.log(conversation)
  console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%')
    if (conversation.channel.userName !== opts.senderId) {
	  const spark = new SparkClient({ token: conversation.channel.token });

	  message.roomId = conversation.chatId
      await spark.messageSendRoom(conversation.chatId, message)
	}
  }
}
