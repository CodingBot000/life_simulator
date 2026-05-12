package com.lifesimulator.backend.recommendation.youtube;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class YoutubeSearchApiClientTests {

  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  @SuppressWarnings({ "unchecked", "rawtypes" })
  void mapsYoutubeSearchResponseAndBuildsRestrictedSearchUri() throws Exception {
    SimulatorProperties.Recommendations.Youtube properties = new SimulatorProperties.Recommendations.Youtube();
    properties.setApiKey("youtube-api-key");
    HttpClient httpClient = mock(HttpClient.class);
    HttpResponse<String> response = response(
      """
      {
        "items": [
          {
            "id": { "videoId": "8GQZuzIdeQQ" },
            "snippet": {
              "title": "커리어 전환 영상",
              "description": "직무 전환을 다루는 영상입니다.",
              "channelTitle": "커리어 채널",
              "thumbnails": {
                "medium": { "url": "https://img.youtube.test/medium.jpg" },
                "high": { "url": "https://img.youtube.test/high.jpg" }
              }
            }
          }
        ]
      }
      """
    );
    when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
      .thenReturn((HttpResponse) response);
    YoutubeSearchApiClient client = new YoutubeSearchApiClient(httpClient, objectMapper, properties);

    var videos = client.search(new YoutubeSearchRequest("커리어 전환", "ko", 3));

    assertThat(videos).hasSize(1);
    assertThat(videos.get(0).videoId()).isEqualTo("8GQZuzIdeQQ");
    assertThat(videos.get(0).title()).isEqualTo("커리어 전환 영상");
    assertThat(videos.get(0).thumbnailUrl()).isEqualTo("https://img.youtube.test/high.jpg");

    ArgumentCaptor<HttpRequest> requestCaptor = ArgumentCaptor.forClass(HttpRequest.class);
    verify(httpClient).send(requestCaptor.capture(), any(HttpResponse.BodyHandler.class));
    String uri = requestCaptor.getValue().uri().toString();
    assertThat(uri).contains("https://www.googleapis.com/youtube/v3/search?");
    assertThat(uri).contains("part=snippet");
    assertThat(uri).contains("type=video");
    assertThat(uri).contains("safeSearch=moderate");
    assertThat(uri).contains("videoEmbeddable=true");
    assertThat(uri).contains("relevanceLanguage=ko");
    assertThat(uri).contains("regionCode=KR");
    assertThat(uri).contains("key=youtube-api-key");
  }

  private HttpResponse<String> response(String body) {
    HttpResponse<String> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(200);
    when(response.body()).thenReturn(body);
    return response;
  }
}
