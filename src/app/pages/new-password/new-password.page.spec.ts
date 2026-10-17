import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';

import { NewPasswordPage } from './new-password.page';
import { AuthService } from '../../services/auth.service';

@Component({ template: '', standalone: true })
class BlankPage {}

describe('NewPasswordPage', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [NewPasswordPage],
      providers: [
        provideRouter([{ path: '**', component: BlankPage }]),
        { provide: ToastController, useValue: { create: async () => ({ present: async () => {} }) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(NewPasswordPage);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, auth: TestBed.inject(AuthService) };
  }

  it('asks for a new password and a confirmation', async () => {
    const { fixture } = await setup();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Code verified');
    expect(text).toContain('Save new password');
  });

  it('needs at least 8 characters and a matching confirmation', async () => {
    const { component, auth } = await setup();
    const spy = vi.spyOn(auth, 'saveNewPassword');

    component.password.set('short');
    await component.save();
    expect(component.formError()).toContain('at least 8');

    component.password.set('longenough1');
    component.confirm.set('different1');
    await component.save();
    expect(component.formError()).toContain('do not match');

    expect(spy).not.toHaveBeenCalled();
  });

  it('shows the server message when saving fails', async () => {
    const { component, auth } = await setup();
    vi.spyOn(auth, 'saveNewPassword').mockResolvedValue({ ok: false, message: 'Your reset session ended.' });

    component.password.set('newpass123');
    component.confirm.set('newpass123');
    await component.save();

    expect(component.formError()).toBe('Your reset session ended.');
  });

  it('signs in and goes home after saving', async () => {
    const { component, auth } = await setup();
    const spy = vi.spyOn(auth, 'saveNewPassword').mockResolvedValue({ ok: true, message: 'Password updated.' });

    component.password.set('newpass123');
    component.confirm.set('newpass123');
    await component.save();

    expect(spy).toHaveBeenCalledWith('newpass123');
    expect(TestBed.inject(Router).url).toBe('/home');
  });

  it('discards the temporary reset session when the screen closes', async () => {
    const { fixture, auth } = await setup();
    const spy = vi.spyOn(auth, 'cancelPasswordReset');

    fixture.destroy();

    expect(spy).toHaveBeenCalled();
  });
});
