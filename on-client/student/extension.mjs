// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  const make = (tag, text, parent) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = String(text);
    if (parent) parent.append(node);
    return node;
  };
  const section = () => document.createElement('section');
  const safeError = (error) => {
    const rawCode = typeof error?.code === 'string' ? error.code : '';
    const code = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(rawCode) ? rawCode : 'UNKNOWN_ERROR';
    const raw = typeof error?.message === 'string' ? error.message.trim() : '';
    const secret = /\b(?:bearer\s+\S+|(?:api[-_ ]?key|token|password|secret|authorization)\s*[:=]\s*\S+|sk-[A-Za-z0-9_-]{12,})/i.test(raw);
    const message = !raw ? '안전한 오류 설명이 제공되지 않았습니다.' : secret
      ? '민감한 값이 포함될 수 있어 오류 상세를 표시하지 않았습니다.'
      : raw.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 400);
    return { code, message };
  };
  const deviceStatus = (value) => {
    const labels = { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
    const code = typeof value === 'string' ? value : 'unknown';
    return `${labels[code] || '확인 불가'} (${code})`;
  };
  const sessionStatus = (value) => {
    const labels = { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' };
    const code = typeof value === 'string' ? value : 'unknown';
    return `${labels[code] || '확인 불가'} (${code})`;
  };

  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = section();
      const modeLabel = (mode) => ({ connected: '연결됨', demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' })[mode] || '확인 불가';
      const resource = (title, item, render) => {
        const box = section(); make('h3', title, box);
        if (!item || item.status === 'loading') make('p', '불러오는 중', box);
        else if (item.status === 'error') make('p', `연결 실패: ${safeError(item.error).message}`, box);
        else if (item.status === 'ok') render(box, item.data);
        else make('p', '확인 불가', box);
        if (item?.mode) make('p', modeLabel(item.mode), box);
        root.append(box);
      };
      resource('계정·현재 기기·로그인 세션', me, (box, data) => {
        make('p', `사용자: ${data?.user?.label || '확인 불가'} · ID: ${data?.user?.id || '확인 불가'}`, box);
        make('p', `현재 기기: ${data?.device?.label || '확인 불가'} · ID: ${data?.device?.id || '확인 불가'} · ${deviceStatus(data?.device?.status)}`, box);
        make('p', `현재 로그인 세션: ID ${data?.session?.id || '확인 불가'} · ${sessionStatus(data?.session?.status)}`, box);
      });
      resource('기기', devices, (box, data) => {
        if (!Array.isArray(data) || !data.length) return make('p', '표시할 기기가 없습니다.', box);
        data.forEach((d) => make('p', `${d?.label || '확인 불가'} · ID: ${d?.id || '확인 불가'} · ${deviceStatus(d?.status)}`, box));
      });
      resource('세션', sessions, (box, data) => {
        if (!Array.isArray(data) || !data.length) return make('p', '표시할 세션이 없습니다.', box);
        data.forEach((s) => make('p', `ID: ${s?.id || '확인 불가'} · ${sessionStatus(s?.status)}`, box));
      });
      return root;
    },

    renderDecision({ status, data, error, appId } = {}) {
      const root = section();
      if (status === 'idle') { make('p', '앱을 골라 접속을 요청하세요.', root); return root; }
      make('p', `업무 앱 ID: ${data?.appId || appId || '확인 불가'}`, root);
      if (status === 'loading') make('p', '판정 확인 중', root);
      else if (status === 'error') {
        make('p', `요청 실패: ${safeError(error).message}`, root);
        make('p', '요청 실패는 접근 거부 판정이 아닙니다.', root);
      } else if (status !== 'ok') make('p', '판정 확인 불가(unknown)', root);
      else {
        const labels = { allow: '허용', deny: '거부', challenge: '추가 확인 필요', unknown: '확인 불가' };
        const original = typeof data?.decision === 'string' ? data.decision : 'unknown';
        const code = Object.hasOwn(labels, original) ? original : 'unknown';
        make('p', `접근 판정: ${labels[code]} (${code})`, root);
        if (code === 'allow') make('p', '정책상 접근 허용이며 실제 업무 앱 접속 성공을 보장하지 않습니다.', root);
        if (code === 'challenge') make('p', '이 앱은 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.', root);
        if (code === 'unknown') make('p', '허용 여부를 확인할 수 없습니다. 허용으로 간주하지 마세요.', root);
        make('p', `판정 이유: ${data?.reason || '확인 불가'}`, root);
        make('p', `판정 시각: ${data?.checkedAt || '확인 불가'}`, root);
      }
      return root;
    },

    renderEvents({ status, data, error } = {}) {
      const root = section();
      if (status === 'loading') { make('p', '기록을 불러오는 중', root); return root; }
      if (status === 'error') { const e = safeError(error); make('p', `${['CONTRACT_MISMATCH','ENGINE_RESULT_UNVERIFIED'].includes(e.code) ? '확인 불가' : '기록을 불러오지 못했습니다'}: ${e.message}`, root); return root; }
      if (status !== 'ok' || !Array.isArray(data)) { make('p', '확인 불가: 기록 상태 또는 데이터 형식을 확인할 수 없습니다.', root); return root; }
      const events = data.slice().sort((a, b) => (Date.parse(b?.at) || 0) - (Date.parse(a?.at) || 0));
      const filters = { kind: 'all', appId: 'all', access: 'all' };
      let selected = null;
      const kindNames = { access: '접속 기록', xdr: 'XDR 경보' };
      const accessNames = { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' };
      const stateText = (kind, raw) => {
        const code = typeof raw === 'string' ? raw : 'unknown';
        const table = kind === 'access' ? accessNames : kind === 'session'
          ? { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' }
          : { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' };
        return `${table[code] || '확인 불가'} (${code})`;
      };
      const detail = (event) => {
        const box = section(); box.setAttribute('data-student-event-detail', String(event.id));
        make('h3', `${event.id} 상세`, box); make('p', `사건 ID: ${event.id}`, box);
        make('p', `업무 앱: ${event.appId || '앱 확인 불가 (appId 없음)'}`, box);
        make('h4', '근거', box);
        if (Array.isArray(event.evidence) && event.evidence.length) event.evidence.forEach((x) => make('p', `${x?.id ?? 'ID 확인 불가'} — ${x?.text ?? ''}`, box)); else make('p', '근거가 없습니다.', box);
        make('h4', '규칙', box);
        if (Array.isArray(event.rules) && event.rules.length) event.rules.forEach((x) => make('p', `${x?.id ?? 'ID 확인 불가'} — ${x?.text ?? ''}`, box)); else make('p', '규칙이 없습니다.', box);
        make('h4', '상태', box);
        make('p', `접속: ${stateText('access', event.state?.access)}`, box);
        make('p', `세션: ${stateText('session', event.state?.session)}`, box);
        make('p', `기기: ${stateText('device', event.state?.device)}`, box);
        const actions = Array.isArray(event.supportedActions) ? event.supportedActions.filter((x) => typeof x === 'string' && x) : [];
        if (actions.length) { make('p', '조치 실행 연결은 준비 중입니다. 이 안내는 조치 요청을 보내지 않습니다.', box); actions.forEach((action) => { const b = make('button', `${action} 미지원`, box); b.type = 'button'; b.disabled = true; }); }
        return box;
      };
      const draw = () => {
        root.replaceChildren();
        for (const [key, label] of [['kind','기록 종류'],['appId','업무 앱'],['access','접속 상태']]) {
          const lab = make('label', `${label}: `, root); const select = make('select', undefined, lab); select.setAttribute('aria-label', label);
          const all = make('option', '전체', select); all.value = 'all';
          const vals = [...new Set(events.map((e) => key === 'access' ? e.state?.access : e[key]).filter((v) => typeof v === 'string' && v))];
          vals.forEach((v) => { const opt = make('option', key === 'kind' ? `${kindNames[v] || '확인 불가'} (${v})` : key === 'access' ? stateText('access', v) : v, select); opt.value = v; });
          select.value = filters[key]; select.addEventListener('change', () => { filters[key] = select.value; draw(); });
        }
        const shown = events.filter((e) => (filters.kind === 'all' || e.kind === filters.kind) && (filters.appId === 'all' || e.appId === filters.appId) && (filters.access === 'all' || e.state?.access === filters.access));
        if (!shown.some((e) => e.id === selected)) selected = null;
        make('p', `표시 건수: ${shown.length}건 / 전체 ${events.length}건`, root);
        const list = make('ul', undefined, root);
        shown.forEach((e) => {
          const row = make('li', undefined, list); row.setAttribute('data-student-event-id', String(e.id));
          make('p', `사건 ID: ${e.id}`, row); make('p', `시각: ${e.at ?? '확인 불가'}`, row);
          make('p', `기록 종류: ${kindNames[e.kind] || '확인 불가'} (${e.kind ?? 'unknown'})`, row);
          make('p', `업무 앱: ${e.appId || '앱 확인 불가 (appId 없음)'}`, row); make('p', `요약: ${e.summary ?? ''}`, row);
          const b = make('button', `${e.id} 상세`, row); b.type = 'button'; b.setAttribute('aria-expanded', String(selected === e.id));
          b.addEventListener('click', () => { selected = selected === e.id ? null : e.id; draw(); });
        });
        if (!shown.length) make('p', events.length ? '필터 조건에 맞는 기록이 없습니다.' : '표시할 기록이 없습니다.', root);
        if (selected !== null) { const e = events.find((x) => x.id === selected); if (e) root.append(detail(e)); }
      };
      draw(); return root;
    },

    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = section();
      const primitive = (v, fallback = '확인 불가') => typeof v === 'string' && v ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : fallback;
      const modes = { connected: '연결됨', demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      make('p', `연결 모드: ${modes[mode] || '확인 불가'}`, root);
      const renderResource = (name, resource, type) => {
        const box = section(); make('h3', name, box);
        if (type === 'sessions') make('p', '세션은 현재 검증된 연결 한 개만 표시하며, 과거 세션 전체 목록이 아닙니다.', box);
        if (!resource || resource.status === 'loading') make('p', `${name} 정보를 불러오는 중입니다.`, box);
        else if (resource.status === 'error') {
          const e = safeError(resource.error); const timeout = /TIME.?OUT|TIMED.?OUT/i.test(e.code) || /시간 초과|timed out|timeout/i.test(e.message);
          make('p', timeout ? `${name} 조회 시간 초과: ${e.message}` : `${name} 정보를 불러오지 못했습니다: ${e.message}`, box);
          make('p', '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.', box);
        } else if (resource.status === 'ok' && Array.isArray(resource.data)) {
          if (!resource.data.length) make('p', type === 'devices' ? '등록된 기기가 없습니다.' : '현재 연결이 없습니다.', box);
          else resource.data.forEach((x) => make('p', type === 'devices' ? `기기: ${primitive(x?.label)} · 상태: ${deviceStatus(x?.status)}` : `세션 ID: ${primitive(x?.id)} · 상태: ${sessionStatus(x?.status)}`, box));
        } else make('p', `${name} 상태를 확인할 수 없습니다.`, box);
        root.append(box);
      };
      renderResource('기기', devices, 'devices'); renderResource('세션', sessions, 'sessions');
      const notice = section(); make('h3', '알림', notice);
      if (!Array.isArray(notifications)) make('p', '알림 정보를 확인할 수 없습니다.', notice);
      else if (!notifications.length) make('p', '주의할 알림이 없습니다.', notice);
      else notifications.forEach((n) => { make('p', `자료: ${primitive(n?.resource)} · 코드: ${primitive(n?.code)}`, notice); make('p', `메시지: ${primitive(n?.message, '메시지 없음')}`, notice); });
      root.append(notice);
      const diag = section(); make('h3', '진단 정보', diag); let safe = null;
      if (!diagnostics || diagnostics.status === 'loading') make('p', '진단 정보를 불러오는 중입니다.', diag);
      else if (diagnostics.status === 'error') { make('p', `진단 정보를 불러오지 못했습니다: ${safeError(diagnostics.error).message}`, diag); make('p', '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.', diag); }
      else if (diagnostics.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object') {
        const d = diagnostics.data; const engine = d.engine && typeof d.engine === 'object' ? d.engine : {};
        safe = { requestId: primitive(d.requestId), component: primitive(d.component), version: primitive(d.version), checkedAt: primitive(d.checkedAt), engine: { mode: primitive(engine.mode), code: primitive(engine.code) } };
        for (const [label, value] of [['요청 ID',safe.requestId],['구성 요소',safe.component],['버전',safe.version],['점검 시각',safe.checkedAt],['엔진 모드',safe.engine.mode],['엔진 코드',safe.engine.code]]) make('p', `${label}: ${value}`, diag);
      } else make('p', '진단 정보를 확인할 수 없습니다.', diag);
      root.append(diag); make('p', '도움정보는 도움 요청에 사용하도록 복사합니다. 비밀값은 복사하지 않습니다.', root);
      const copy = make('button', '도움정보 복사', root); copy.type = 'button'; copy.disabled = safe === null;
      const status = make('p', '', root); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
      if (safe) copy.addEventListener('click', async () => { try { if (typeof globalThis.navigator?.clipboard?.writeText !== 'function') throw new Error(); await globalThis.navigator.clipboard.writeText(JSON.stringify(safe, null, 2)); status.textContent = '비밀 없는 도움정보를 복사했습니다.'; } catch { status.textContent = '도움정보를 복사하지 못했습니다. 브라우저의 복사 권한을 확인하세요.'; } });
      return root;
    },

    renderAiConnection({ status, data, error, checkedAt } = {}) {
      const root = section();
      const manual = '다시 점검하려면 「현재 API 연결 점검」 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.';
      if (status === 'idle') {
        make('p', 'AI 연결 점검 전', root);
        make('p', '계정 연결 또는 권한 변경 뒤에는 새 점검 결과를 기다려야 합니다. 이전 결과는 현재 상태가 아닙니다.', root);
        make('p', manual, root);
        return root;
      }
      if (status === 'loading') {
        make('p', 'AI 연결 점검 중', root);
        make('p', '연결 점검 중이며 사건 설명 실행 여부는 아직 확인되지 않았습니다.', root);
        make('p', manual, root);
        return root;
      }
      if (status === 'ok') {
        const auth = data?.audienceAuthorization;
        const authText = auth === 'test' ? '시험 연결 점검(test)' : auth === 'verified' ? '앱 권한 확인 후 점검(verified)' : '권한 확인 불가(unknown)';
        make('p', authText, root);
        make('p', `사용 가능한 모델 수: ${Number.isFinite(data?.modelCount) ? data.modelCount : '확인 불가'}`, root);
        make('p', `점검 시각: ${checkedAt || data?.checkedAt || '확인 불가'}`, root);
        make('p', 'AI 연결과 모델 응답만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다.', root);
        make('p', manual, root);
        return root;
      }
      if (status === 'error') {
        const e = safeError(error); const c = e.code.toUpperCase();
        let guidance = '점검 원인을 확인할 수 없습니다. 담당자에게 안전한 오류 코드와 함께 문의하세요.';
        if (/PREPAR|NOT_READY|AUTHORIZATION_PENDING|PERMISSION_PENDING|UNVERIFIED/.test(c)) guidance = '권한 준비 중 또는 확인 불가입니다. 담당자에게 계정 연결과 앱 권한을 확인해 달라고 요청하세요.';
        else if (/AUTH|UNAUTH|CREDENTIAL|LOGIN/.test(c)) guidance = '인증 실패입니다. 계정 연결을 다시 확인하고 담당자에게 확인을 요청하세요.';
        else if (/FORBIDDEN|ACCESS_DENIED|ACCESS_RESTRICTED|PERMISSION/.test(c)) guidance = '접근이 제한되었습니다. 계정 연결을 다시 확인하고 담당자에게 권한 확인을 요청하세요.';
        else if (/WB_CLCO_COHORT_BUDGET_EXHAUSTED|QUOTA|LIMIT|USAGE|RATE/.test(c)) guidance = '사용량 또는 이용 한도에 도달했습니다. 담당자에게 확인을 요청하세요.';
        else if (/SCHEDULE|OUTSIDE_HOURS|NOT_IN_HOURS/.test(c)) guidance = '현재 이용 시간이 아닙니다. 이용 가능 시간을 확인하세요.';
        else if (/TIME.?OUT|NETWORK|TEMPORARY|UNAVAILABLE|TOO_MANY_REQUESTS/.test(c)) guidance = '요청 제한·시간 초과 또는 네트워크 오류일 수 있습니다. 잠시 뒤 직접 다시 점검하세요.';
        else if (/CANCEL/.test(c)) guidance = '점검이 취소되었습니다. 이전 결과는 현재 점검 결과가 아닙니다.';
        else if (/MODEL.*(NONE|MISSING|UNAVAILABLE)|NO_MODEL/.test(c)) guidance = '사용 가능한 모델이 없습니다. 담당자에게 모델 허용 설정을 확인해 달라고 요청하세요.';
        make('p', `AI 연결 점검 실패 (${e.code}): ${e.message}`, root);
        make('p', guidance, root); make('p', '이전 점검 결과는 현재 결과가 아닙니다.', root); make('p', manual, root);
        return root;
      }
      make('p', 'AI 연결 점검 결과를 확인할 수 없습니다.', root); make('p', manual, root); return root;
    },

    renderExplanation({ event, explanation, checkedAt } = {}) {
      const root = section();
      if (explanation?.status === 'ok') {
        root.setAttribute('data-student-explanation-event', String(event?.id ?? ''));
        make('p', `사건 ID: ${event?.id ?? '확인 불가'}`, root);
        make('p', `AI 설명: ${typeof explanation.data?.summary === 'string' && explanation.data.summary ? explanation.data.summary : '설명 내용을 확인할 수 없습니다.'}`, root);
        if (checkedAt) make('p', `설명 확인 시각: ${checkedAt}`, root);
      } else if (explanation?.status === 'error') {
        const e = safeError(explanation.error); make('p', '사건 설명 요청 실패', root);
        make('p', `오류 코드: ${e.code}`, root); make('p', `오류 메시지: ${e.message}`, root);
        make('p', '사건 기록은 변경되지 않았습니다.', root);
      } else if (explanation?.status === 'loading') make('p', '사건 설명을 처리 중입니다.', root);
      else if (explanation?.status === 'idle' || !explanation?.status) make('p', '사건 설명을 아직 요청하지 않았습니다.', root);
      else make('p', '사건 설명 결과를 확인할 수 없습니다. 사건 기록은 변경되지 않았습니다.', root);
      return root;
    },

    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
