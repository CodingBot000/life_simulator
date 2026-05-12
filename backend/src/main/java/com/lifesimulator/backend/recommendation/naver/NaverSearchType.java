package com.lifesimulator.backend.recommendation.naver;

public enum NaverSearchType {
  BOOK("book", "/v1/search/book.json"),
  SHOPPING("shop", "/v1/search/shop.json");

  private final String itemType;
  private final String path;

  NaverSearchType(String itemType, String path) {
    this.itemType = itemType;
    this.path = path;
  }

  public String itemType() {
    return itemType;
  }

  public String path() {
    return path;
  }
}
