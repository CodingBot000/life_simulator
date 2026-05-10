package com.lifesimulator.backend.testsupport;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.springframework.beans.factory.ObjectProvider;

public final class ObjectProviderTestSupport {

  private ObjectProviderTestSupport() {}

  @SuppressWarnings("unchecked")
  public static <T> ObjectProvider<T> providerOf(T value) {
    ObjectProvider<T> provider = mock(ObjectProvider.class);
    when(provider.getIfAvailable()).thenReturn(value);
    return provider;
  }
}
