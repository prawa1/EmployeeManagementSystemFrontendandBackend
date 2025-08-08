package com.example.demo.exception;

public class ResourceNotFoundException extends RuntimeException{

	private String resourceName;
	private String fieldName;
	private int fieldValue;
	public ResourceNotFoundException(String resourceName, String fieldName, int fieldValue) {
		super(resourceName+" "+fieldName+" "+fieldValue+" not found");
		System.out.println("exception constructor");
	}
	@Override
	public String toString() {
		return "ResourceNotFoundException [resourceName=" + resourceName + ", fieldName=" + fieldName + ", fieldValue="
				+ fieldValue + "]";
	}
}
