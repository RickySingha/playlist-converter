import {google} from 'googleapis';
const youtube = google.youtube({
  version: 'v3',
  auth: 'AIzaSyB5r0Q8GTdXpGfBrtK6klzqfm43OVEBjS8' // Replace 'YOUR_API_KEY' with your actual API key
});

export function checkValid(youtubePlaylistLink) {
  const pattern = /^https?:\/\/(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)(?:&\S*)?$/;
  return pattern.test(youtubePlaylistLink);
}

export async function getData(youtubePlaylistLink) {
  const playlistId = youtubePlaylistLink.split('/playlist?list=')[1].split('&')[0];
  const videosId = await getVideos(playlistId);
  const videos = await getName(videosId);
  return videos;
}

async function getVideos(playlistId) {
  const response = await youtube.playlistItems.list({
    part: 'snippet',
    playlistId: playlistId,
    maxResults: 50
  });
  const videoId = response.data.items.map(item => item.snippet.resourceId.videoId);
  return videoId;
}

async function getName(videosId) {
    const videoName = [];
    for (const id of videosId) {
      const response = await youtube.videos.list({
        part: 'snippet',
        id: id
      });
      if (response.data.items && response.data.items.length > 0) {
        const title = response.data.items[0].snippet.title;
        videoName.push(title);
      } else {
        // Handle the case where no items are found in the response
       continue;
      }
    }
    return videoName;
  }
  
// export {checkValid,getData};
// Example usage
// const youtubePlaylistLink = 'https://youtube.com/playlist?list=PLtEwcfowzaLOnt4dTlEbrkjuhrivuijYo';
// if (checkValid(youtubePlaylistLink)) {
//   getData(youtubePlaylistLink)
//     .then(videos => console.log(videos))
//     .catch(error => console.error(error));
// } else {
//   console.log('Invalid YouTube playlist link');
// }

