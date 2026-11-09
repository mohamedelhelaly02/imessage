import { HttpInterceptorFn } from '@angular/common/http';
import { SKIP_API_COOKIES } from './request-context';

export const cookiesInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_API_COOKIES)) {
    return next(req);
  }

  const clonedRequest = req.clone({ withCredentials: true });

  return next(clonedRequest);
};
