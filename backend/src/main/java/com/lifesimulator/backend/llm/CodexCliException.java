package com.lifesimulator.backend.llm;

public class CodexCliException extends RuntimeException {

  public CodexCliException(String message) {
    super(message);
  }

  public CodexCliException(String message, Throwable cause) {
    super(message, cause);
  }
}
