import { HttpInterceptorFn } from '@angular/common/http';

export const cookiesInterceptor: HttpInterceptorFn = (req, next) => {
  const clonedRequest = req.clone({ withCredentials: true });

  return next(clonedRequest);
};
