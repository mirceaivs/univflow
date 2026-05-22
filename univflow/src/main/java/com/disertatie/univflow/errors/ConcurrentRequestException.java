package com.disertatie.univflow.errors;


public class ConcurrentRequestException extends RuntimeException {
    public ConcurrentRequestException(String message) {
        super(message);
    }
}