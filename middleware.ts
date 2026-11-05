import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Block/redirect legacy /login route directly to homepage
    if (pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Protect /admin routes, redirect unauthorized requests to /gdgr
    if (pathname.startsWith('/admin')) {
        const adminSession = request.cookies.get('admin_session');

        if (!adminSession || adminSession.value !== 'true') {
            return NextResponse.redirect(new URL('/gdgr', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/login'],
};
