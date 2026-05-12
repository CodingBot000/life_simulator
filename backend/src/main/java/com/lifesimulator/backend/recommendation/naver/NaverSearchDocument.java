package com.lifesimulator.backend.recommendation.naver;

public record NaverSearchDocument(
  NaverSearchType type,
  String title,
  String link,
  String image,
  String description,
  String author,
  String publisher,
  String discount,
  String productId,
  String lprice,
  String mallName,
  String brand,
  String maker,
  String category1,
  String category2,
  String category3
) {
  public NaverSearchDocument {
    title = normalize(title);
    link = normalize(link);
    image = normalize(image);
    description = normalize(description);
    author = normalize(author);
    publisher = normalize(publisher);
    discount = normalize(discount);
    productId = normalize(productId);
    lprice = normalize(lprice);
    mallName = normalize(mallName);
    brand = normalize(brand);
    maker = normalize(maker);
    category1 = normalize(category1);
    category2 = normalize(category2);
    category3 = normalize(category3);
  }

  private static String normalize(String value) {
    return value == null ? "" : value.trim();
  }
}
