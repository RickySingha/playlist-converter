// Add necessary imports
import express from 'express';
import querystring from 'querystring';
import axios from 'axios';
import bodyParser from 'body-parser';
import * as yt from './youtube.js';
import { dirname } from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
const state = process.env.STATE_KEY;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
console.log(client_id);
const scope = 'user-library-read playlist-modify-public playlist-modify-private';
const redirect_uri = 'https://youtube-to-spotify-playlist-converter.onrender.com/redirect';
var spotifyPlaylistName;
let userId;
let accessToken;
let refreshToken;
let expiresAt;
let videoName;
const port = process.env.PORT || 3000;


const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static("public"));

app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

app.post('/login', async (req, res) => {
    const youtubePlaylistLink = req.body.youtubePlaylistLink;

    if (!yt.checkValid(youtubePlaylistLink)) {
            res.sendFile(__dirname + "/public/index.html");
        
    } else {
        spotifyPlaylistName = req.body.spotifyPlaylistName;
        console.log(spotifyPlaylistName);

        videoName = await yt.getData(youtubePlaylistLink);
        console.log(videoName);

        res.redirect('https://accounts.spotify.com/authorize?' +
            querystring.stringify({
                response_type: 'code',
                client_id: client_id,
                redirect_uri: redirect_uri,
                state: state,
                scope: scope,
                show_dialog: true
            }));
    }
});

app.get('/redirect', async (req, res) => {
    const error = req.query.error;

    if (error) {
        res.redirect('/');
    }

    const code = req.query.code;
    const requestHeaders = {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`
    };

    const requestData = {
        'code': code,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code'
    };

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', requestData, { headers: requestHeaders });
        accessToken = response.data.access_token;
        refreshToken = response.data.refresh_token;
        expiresAt = response.data.expires_in;

        console.log(accessToken);

        userId = await getUserId(accessToken);
        await createPlaylist(userId, spotifyPlaylistName, accessToken);
        const playlistId = await getPlaylistId(spotifyPlaylistName);
        console.log(playlistId);
        await addTracks(playlistId,videoName);

        res.sendFile(__dirname + "/public/success.html");
        // , function (err) {
        //     if (err) {
        //       // Handle error if the file cannot be sent
        //       console.error('Error sending file:', err);
        //       res.status(err.status).end();
        //     } else {
        //       // Once the file is sent successfully, stop the server
        //       server.close(function () {
        //         console.log('Server stopped.');
        //       });
        //     }
        //   });

        //kill the program
        // process.exit();

    } catch (error) {
        console.log(error);
    }
});



async function getUserId(accessToken) {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        });
        const data = response.data;
        console.log(data.id);
        return data.id;
    } catch (error) {
        console.error('Error fetching profile:', error);
        throw error;
    }
}

async function createPlaylist(userId, spotifyPlaylistName, accessToken) {
    try {
        const url = `https://api.spotify.com/v1/users/${userId}/playlists`;
        const data = {
            'name': spotifyPlaylistName
        };

        const reqheaders = {
            'Authorization': 'Bearer ' + accessToken,
            'Content-type': 'application/json'
        };

        const response = await axios.post(url, data, { headers: reqheaders });
        console.log('Playlist created successfully');
        return;
    } catch (error) {
        console.log('Error:', error.response.data);
    }
}


async function getPlaylistId(spotifyPlaylistName){
    try{
        const url = 'https://api.spotify.com/v1/me/playlists';
        const reqheaders = {
            'Authorization': 'Bearer ' + accessToken
        };
        const response = await axios.get(url,{headers: reqheaders});
        //check if we get a response and retrieve its id
        if(response && response.data && response.data.items){
            //search for the created playlist
            for(const playlist of response.data.items){
                if(playlist.name === spotifyPlaylistName){
                    
                    return playlist.id;
                }
            }
        }
        return null;

    } catch(error){
        console.log(error.response.data);
        return null;
    }
}

//function to add tracks to the playlist

async function addTracks(playlistId,videoName){
    try{
        //search for each song and get its song uri
        const songUri = [];

        //loop to get each song uri
        for (const video of videoName) {
            try {
                const searchQuery = encodeURIComponent(video); // Encode the video name for the URL
                const url = `https://api.spotify.com/v1/search?q=${searchQuery}&type=track&limit=1`;
        
                const headers = {
                    'Authorization': `Bearer ${accessToken}`
                };
        
                const response = await axios.get(url, { headers });
        
                const uri = response.data.tracks.items[0].uri;
            //    console.log(uri);
               songUri.push(uri);
                // Handle response data here
            } catch (error) {
                console.error('Error searching for song:', error);
                // Handle error here
            }
            // songUri = songUri.flat();
            
        }
        console.log(songUri);
        await final(playlistId,songUri);
        return;
        
    }catch(error){
        console.log(error.response.data);
    }
}

async function final(playlistId, songUri) {
    try {
        // Add items to the playlist
        const data = {
            uris: songUri
        };

        const reqheaders = {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json'
        };

        const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
        const response = await axios.post(url, data, { headers: reqheaders });
        return;
    } catch (error) {
        console.error('Error adding songs to playlist:', error.response.data);
        return null;
    }
}

//run the server
const server = app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
