package com.lifesimulator.backend.engine.routing;

public enum ExecutionMode {
  LIGHT("light"),
  STANDARD("standard"),
  CAREFUL("careful"),
  FULL("full");

  private final String value;

  ExecutionMode(String value) {
    this.value = value;
  }

  public String value() {
    return value;
  }
}
