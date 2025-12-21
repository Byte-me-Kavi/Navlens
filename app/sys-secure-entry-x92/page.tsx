
import React from 'react';
import AdminLoginForm from './LoginForm';

export const metadata = {
  title: 'System Access',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
