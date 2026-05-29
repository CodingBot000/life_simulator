package com.lifesimulator.backend.memory;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SessionMemoryController {

  private final SessionIdResolver sessionIdResolver;
  private final SessionMemoryService sessionMemoryService;

  public SessionMemoryController(
    SessionIdResolver sessionIdResolver,
    SessionMemoryService sessionMemoryService
  ) {
    this.sessionIdResolver = sessionIdResolver;
    this.sessionMemoryService = sessionMemoryService;
  }

  @GetMapping("/api/session-memory/decisions")
  public SessionMemoryDecisionListResponse list(@RequestHeader HttpHeaders headers) {
    return sessionMemoryService.list(sessionIdResolver.resolve(headers));
  }

  @PostMapping("/api/session-memory/decisions")
  public SessionMemoryDecision save(
    @RequestBody SessionMemoryDecisionRequest request,
    @RequestHeader HttpHeaders headers
  ) {
    return sessionMemoryService.save(sessionIdResolver.resolve(headers), request);
  }

  @DeleteMapping("/api/session-memory/decisions/{memoryId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(
    @PathVariable String memoryId,
    @RequestHeader HttpHeaders headers
  ) {
    sessionMemoryService.delete(sessionIdResolver.resolve(headers), memoryId);
  }

  @DeleteMapping("/api/session-memory/decisions")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void clear(@RequestHeader HttpHeaders headers) {
    sessionMemoryService.clear(sessionIdResolver.resolve(headers));
  }
}
