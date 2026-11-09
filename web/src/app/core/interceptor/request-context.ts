import { HttpContextToken } from '@angular/common/http';

export const SKIP_API_AUTH = new HttpContextToken<boolean>(() => false);
export const SKIP_API_COOKIES = new HttpContextToken<boolean>(() => false);
