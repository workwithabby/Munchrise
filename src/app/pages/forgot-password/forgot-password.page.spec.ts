import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { ForgotPasswordPage } from './forgot-password.page';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class BlankPage {}

describe('ForgotPasswordPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [ForgotPasswordPage],
      providers: [
        provideRouter([{ path: '**', component: BlankPage }]),
        { provide: ToastController, useValue: { create: async () => ({ present: async () => {} }) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(ForgotPasswordPage);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, auth: TestBed.inject(AuthService) };
  }

  it('asks for an email and offers to send the code', async () => {
    const { fixture } = await setup();
    expect(fixture.nativeElement.textContent).toContain('Send code');
  });

  it('rejects an invalid email without calling the server', async () => {
    const { component, auth } = await setup();
    const spy = vi.spyOn(auth, 'requestPasswordReset');

    component.email.set('not-an-email');
    await component.sendCode();

    expect(component.formError()).toContain('valid email');
    expect(spy).not.toHaveBeenCalled();
  });

  it('opens the code screen with the email once the code is sent', async () => {
    const { component, auth } = await setup();
    vi.spyOn(auth, 'requestPasswordReset').mockResolvedValue({ ok: true, message: 'sent' });

    component.email.set('abi@example.com');
    await component.sendCode();

    expect(TestBed.inject(Router).url).toBe('/reset-code?email=abi@example.com');
  });

  it('stays here and shows the message when sending fails', async () => {
    const { component, auth } = await setup();
    vi.spyOn(auth, 'requestPasswordReset').mockResolvedValue({ ok: false, message: 'Too many attempts.' });

    component.email.set('abi@example.com');
    await component.sendCode();

    expect(component.formError()).toBe('Too many attempts.');
    expect(TestBed.inject(Router).url).not.toContain('reset-code');
  });
});
