const http = require("http")
const crypto = require("crypto")
const axios = require("axios").default

async function request(info){
	let response
	try {
		response = await axios.request(info)
	} catch(err){
		if (typeof(err) == "object"){
			response = err.response
		}
	}
	return response
}

const PORT = process.env.PORT || 80
const AccessKey = process.env.ACCESS_KEY && Buffer.from(process.env.ACCESS_KEY)
const server = http.createServer()

server.on("request", async function(req, res){
	req.on("error", function(err){
		console.error(err)
	})
	let headers = req.headers
	let accesskey = headers["access-key"]
	let IP = req.socket.localAddress
	
	if (typeof(accesskey) !== "string"){
		console.log("Request from " + IP + ", HTTP 401")
		res.statusCode = 401
		res.end()
		return
	}
	let accessKeyBuffer = Buffer.from(accesskey)
	if (accessKeyBuffer.length !== AccessKey.length || !crypto.timingSafeEqual(accessKeyBuffer, AccessKey)){
		console.log("Request from " + IP + ", HTTP 403")
		res.statusCode = 403
		res.end()
		return
	}
	if (req.method !== "POST"){
		console.log("Request from " + IP + ", HTTP 405")
		res.statusCode = 405
		res.end()
		return
	}
	let data = []
	req.on("data", function(chunk){
		data.push(chunk)
	})
	req.on("end", async function(){
		data = Buffer.concat(data).toString()
		let parsed
		try {
			parsed = JSON.parse(data)
		} catch(err){
			console.log("Request from " + IP + ", HTTP 422")
			res.statusCode = 422
			res.end()
			return
		}
		if (typeof(parsed) !== "object"){
			console.log("Request from " + IP + ", HTTP 422")
			res.statusCode = 422
			res.end()
			return
		}
		let response = await request(parsed)
		if (response == undefined){
			console.log("Request from " + IP + ", HTTP 500")
			res.statusCode = 500
			res.end()
			return
		}
		console.log("Request from " + IP + " requested " + data.url)
		res.statusCode = 200
		res.end(JSON.stringify({
			["status"]: response.status,
			["statusText"]: response.statusText,
			["headers"]: response.headers,
			["data"]: response.data,
		}))
	})
})

server.listen(PORT, (err) => {
	if (err){
		console.error(`Server listening error: ${err}`)
		return
	}
	console.log(`Server started on port ${PORT}`)
})
