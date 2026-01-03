import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

interface ApiError {
  code: ApiErrorCode;
  message: string;
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 返回成功响应
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } as ApiSuccessResponse<T>, { status });
}

/**
 * 返回错误响应
 */
export function errorResponse(code: ApiErrorCode, message: string, status: number) {
  return NextResponse.json({ success: false, error: { code, message } } as ApiErrorResponse, { status });
}

/**
 * 未认证错误
 */
export function unauthorizedResponse(message = "请先登录") {
  return errorResponse("UNAUTHORIZED", message, 401);
}

/**
 * 参数验证错误
 */
export function validationErrorResponse(message: string) {
  return errorResponse("VALIDATION_ERROR", message, 400);
}

/**
 * 资源不存在错误
 */
export function notFoundResponse(message = "资源不存在") {
  return errorResponse("NOT_FOUND", message, 404);
}

/**
 * 服务器内部错误
 */
export function internalErrorResponse(message = "服务器内部错误") {
  return errorResponse("INTERNAL_ERROR", message, 500);
}
