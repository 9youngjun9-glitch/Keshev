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
      const fail = (title, code, message) => {
        make('h3', title, root);
        if (code) make('p', `오류 코드: ${code}`, root);
        if (message) make('p', message, root);
        make('p', '사건 기록은 그대로입니다.', root);
        return root;
      };

      if (explanation?.status === 'error') {
        const e = safeError(explanation.error);
        make('h3', 'AI 설명 실패', root);
        make('p', `오류 코드: ${e.code}`, root);
        make('p', `오류 메시지: ${e.message}`, root);
        if (/EVIDENCE|GROUND|INSUFFICIENT|MISMATCH/i.test(e.code)) {
          make('p', '근거가 부족하거나 현재 기록과 일치하지 않아 설명을 표시할 수 없습니다.', root);
        }
        make('p', '사건 기록은 그대로입니다.', root);
        return root;
      }
      if (!event) {
        make('p', '보안 기록에서 기록을 먼저 고르세요.', root);
        return root;
      }
      if (explanation?.status === 'loading') {
        make('p', '사건 설명 요청 중', root);
        return root;
      }
      if (explanation?.status === 'idle' || !explanation?.status) {
        make('p', '선택한 기록의 사건 설명을 아직 요청하지 않았습니다.', root);
        return root;
      }
      if (explanation.status !== 'ok') {
        return fail('AI 설명 결과를 확인할 수 없습니다.', '', '사건 설명 결과를 확인할 수 없습니다.');
      }

      const data = explanation.data;
      const eventId = event.id;
      if (eventId === undefined || eventId === null || String(eventId) === '') {
        return fail('AI 설명을 표시할 수 없습니다.', 'EVENT_ID_MISSING', '선택한 기록의 ID를 확인할 수 없습니다.');
      }

      const evidence = Array.isArray(event.evidence) ? event.evidence : [];
      const evidenceById = new Map();
      for (const item of evidence) {
        if (item?.id === undefined || item?.id === null) continue;
        const key = String(item.id);
        if (evidenceById.has(key)) {
          return fail('AI 설명을 표시할 수 없습니다.', 'EVIDENCE_ID_MISMATCH', '기록에 중복된 근거 ID가 있어 설명을 표시할 수 없습니다.');
        }
        evidenceById.set(key, item);
      }

      const evidenceIds = Array.isArray(data?.evidenceIds) ? data.evidenceIds : [];
      if (evidenceIds.length === 0) {
        return fail('AI 설명을 표시할 수 없습니다.', 'INSUFFICIENT_EVIDENCE', '인용된 근거가 없어 설명을 표시할 수 없습니다.');
      }
      const citedIds = new Set();
      const citedEvidence = [];
      for (const id of evidenceIds) {
        const key = String(id);
        if (citedIds.has(key) || !evidenceById.has(key)) {
          return fail('AI 설명을 표시할 수 없습니다.', 'EVIDENCE_ID_MISMATCH', '근거 ID가 현재 기록의 근거와 일치하지 않습니다. 근거 내용을 만들어 표시하지 않았습니다.');
        }
        citedIds.add(key);
        citedEvidence.push(evidenceById.get(key));
      }

      const proposals = Array.isArray(data?.proposals) ? data.proposals : [];
      const supportedActions = Array.isArray(event.supportedActions) ? event.supportedActions : [];
      for (const proposal of proposals) {
        if (!proposal || typeof proposal.action !== 'string' || !proposal.action) {
          return fail('AI 설명을 표시할 수 없습니다.', 'PROPOSAL_INVALID', '제안된 조치를 확인할 수 없습니다.');
        }
        if (!supportedActions.includes(proposal.action)) {
          return fail('AI 설명을 표시할 수 없습니다.', 'UNSUPPORTED_ACTION', '연동 시스템이 지원하지 않는 조치가 포함되어 있어 설명을 표시할 수 없습니다.');
        }
        const proposalIds = Array.isArray(proposal.evidenceIds) ? proposal.evidenceIds : [];
        if (!proposalIds.length || proposalIds.some((id) => !evidenceById.has(String(id)))) {
          return fail('AI 설명을 표시할 수 없습니다.', 'EVIDENCE_ID_MISMATCH', '제안의 근거 ID가 현재 기록과 일치하지 않습니다.');
        }
      }
      if (data?.executed !== false) {
        return fail('AI 설명을 표시할 수 없습니다.', 'EXECUTION_STATE_INVALID', '실행되지 않은 설명인지 확인할 수 없습니다.');
      }
      if (proposals.length > 0 && data?.requiresHumanConfirmation !== true) {
        return fail('AI 설명을 표시할 수 없습니다.', 'HUMAN_CONFIRMATION_REQUIRED', '사람의 확인이 필요한 제안인지 확인할 수 없습니다.');
      }
      if (typeof data?.summary !== 'string' || !data.summary.trim()) {
        return fail('AI 설명을 표시할 수 없습니다.', 'SUMMARY_MISSING', '설명 요약이 없습니다.');
      }

      root.setAttribute('data-student-explanation-event', String(eventId));
      make('p', `사건 ID: ${eventId}`, root);
      make('h3', 'AI 설명(참고용)', root);
      make('p', data.summary, root);
      if (checkedAt) make('p', `설명 확인 시각: ${checkedAt}`, root);

      make('h4', '인용한 근거', root);
      for (const item of citedEvidence) {
        make('p', `${item.id} — ${typeof item.text === 'string' ? item.text : '근거 내용을 확인할 수 없습니다.'}`, root);
      }

      make('h4', '규칙', root);
      const rules = Array.isArray(event.rules) ? event.rules : [];
      if (rules.length) {
        for (const rule of rules) {
          make('p', `${rule?.id ?? 'ID 확인 불가'} — ${typeof rule?.text === 'string' ? rule.text : '규칙 내용을 확인할 수 없습니다.'}`, root);
        }
      } else {
        make('p', '규칙이 없습니다.', root);
      }

      make('h4', '현재 상태', root);
      const state = event.state || {};
      const stateLabels = {
        access: { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const unknownStates = [];
      for (const [key, label] of [['access', '접속'], ['session', '세션'], ['device', '기기']]) {
        const value = typeof state[key] === 'string' && state[key] ? state[key] : 'unknown';
        const description = stateLabels[key][value] || '확인 불가';
        make('p', `${label}: ${description} (${value})`, root);
        if (description === '확인 불가') unknownStates.push(label);
      }
      make('p', `확인 불가 상태: ${unknownStates.length ? unknownStates.join(', ') : '없음'}`, root);

      make('h4', 'AI 제안', root);
      if (!proposals.length) {
        make('p', supportedActions.length === 0
          ? '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).'
          : 'AI가 제안한 조치가 없습니다.', root);
      } else {
        for (const proposal of proposals) {
          make('p', `조치: ${proposal.action}`, root);
          make('p', `이유: ${typeof proposal.reason === 'string' && proposal.reason ? proposal.reason : '이유가 제공되지 않았습니다.'}`, root);
          make('p', `근거 ID: ${proposal.evidenceIds.map(String).join(', ')}`, root);
          make('p', '사람 확인이 필요하며 실행되지 않았습니다.', root);
        }
      }
      return root;
    },

    renderVulnerabilities({ status, mode, data, error } = {}) {
      const root = section();
      const modes = { connected: '연결됨', demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가' };
      make('p', `연결 모드: ${modes[mode] || '확인 불가'}`, root);
      if (status === 'idle') {
        make('p', '패키지 취약점 조회 전', root);
        return root;
      }
      if (status === 'loading') {
        make('p', '패키지 취약점 조회 중', root);
        return root;
      }
      if (status === 'error') {
        const e = safeError(error);
        make('p', `패키지 취약점 조회 실패 (${e.code}): ${e.message}`, root);
        make('p', '조회 실패는 취약점 없음이라는 뜻이 아닙니다. 다시 조회하려면 제공 화면에서 직접 요청하세요.', root);
        return root;
      }
      if (status !== 'ok' || !data || typeof data !== 'object' || Array.isArray(data)) {
        make('p', '패키지 취약점 결과를 확인할 수 없습니다.', root);
        return root;
      }

      const scanLabels = {
        complete: '모두 조회 (complete)',
        partial: '일부 조회 실패 (partial)',
        not_checked: '아직 조회 안 함 (not_checked)',
        not_configured: '조회 준비 미완료 (not_configured)',
        unverifiable: 'lock 파일 확인 불가 (unverifiable)',
      };
      const scanStatus = typeof data.status === 'string' ? data.status : 'unknown';
      make('h3', '사용 라이브러리 취약점 조회', root);
      make('p', `전체 조회 상태: ${scanLabels[scanStatus] || `확인 불가 (${scanStatus})`}`, root);
      if (data.lockfileVersion !== undefined && data.lockfileVersion !== null) {
        make('p', `잠금 파일 버전: ${typeof data.lockfileVersion === 'number' ? data.lockfileVersion : '확인 불가'}`, root);
      }
      if (typeof data.lockfileHash === 'string' && data.lockfileHash) make('p', `잠금 파일 해시: ${data.lockfileHash}`, root);
      else if (['complete', 'partial', 'not_checked'].includes(scanStatus)) make('p', '잠금 파일 해시: 확인 불가', root);
      make('p', `전체 조회 시각: ${typeof data.checkedAt === 'string' && data.checkedAt ? data.checkedAt : '확인 불가'}`, root);

      if (!Array.isArray(data.packages)) {
        make('p', '패키지 목록 형식을 확인할 수 없습니다. 취약점 없음으로 판단하지 않습니다.', root);
        return root;
      }
      if (data.packages.length === 0) {
        const emptyText = scanStatus === 'not_configured' ? '프로젝트 조회 설정이 없어 아직 조회할 수 없습니다.'
          : scanStatus === 'not_checked' ? '승인된 공개 패키지가 없어 아직 조회하지 않았습니다.'
            : scanStatus === 'unverifiable' ? '설치 목록을 확인할 수 없어 패키지 결과가 없습니다.'
              : scanStatus === 'complete' ? '표시할 패키지 조회 결과가 없습니다.'
                : scanStatus === 'partial' ? '일부 조회 결과는 확인할 수 없고, 표시할 패키지 행이 없습니다.'
                  : '표시할 패키지 결과가 없습니다. 조회 상태는 확인 불가입니다.';
        make('p', emptyText, root);
        return root;
      }

      const packageLabels = {
        known_vulnerabilities: '알려진 항목 있음 (known_vulnerabilities)',
        none_found: '알려진 항목 없음 (none_found)',
        unverifiable: '조회 확인 불가 (unverifiable)',
      };
      for (const pkg of data.packages) {
        const row = section();
        const name = typeof pkg?.name === 'string' && pkg.name ? pkg.name : '패키지 이름 확인 불가';
        const version = typeof pkg?.version === 'string' && pkg.version ? pkg.version : '설치 버전 확인 불가';
        row.setAttribute('data-student-package-name', name);
        row.setAttribute('data-student-package-version', version);
        make('h4', `${name} · 설치 버전: ${version}`, row);
        const packageStatus = typeof pkg?.status === 'string' ? pkg.status : 'unknown';
        let packageLabel = packageLabels[packageStatus] || `확인 불가 (${packageStatus})`;
        const findings = Array.isArray(pkg?.vulnerabilities) ? pkg.vulnerabilities : null;
        if (!findings) packageLabel = '조회 확인 불가 (unverifiable)';
        if (packageStatus === 'unverifiable' && findings?.length) {
          make('p', '일부 확인·전체 조회 확인 불가', row);
        }
        make('p', `패키지 조회 상태: ${packageLabel}`, row);
        make('p', `출처: ${typeof pkg?.source === 'string' && pkg.source ? pkg.source : '확인 불가'}`, row);
        make('p', `패키지 조회 시각: ${typeof pkg?.checkedAt === 'string' && pkg.checkedAt ? pkg.checkedAt : '확인 불가'}`, row);

        if (!findings) {
          make('p', '취약점 목록 형식을 확인할 수 없습니다. 취약점 없음으로 판단하지 않습니다.', row);
        } else if (findings.length) {
          make('h5', '취약점 정보', row);
          findings.forEach((finding) => {
            const id = typeof finding?.id === 'string' && finding.id ? finding.id : '식별자 확인 불가';
            const modified = typeof finding?.modified === 'string' && finding.modified ? finding.modified : '수정 시각 확인 불가';
            make('p', `취약점 ID: ${id} · 수정 시각: ${modified}`, row);
          });
        } else if (packageStatus === 'none_found') {
          make('p', '조회 시점 기준 알려진 취약점 항목이 없습니다.', row);
        } else if (packageStatus === 'known_vulnerabilities') {
          make('p', '취약점 상태와 목록이 일치하지 않아 결과를 확인할 수 없습니다.', row);
        } else {
          make('p', '조회 확인 불가이며 취약점 없음으로 판단할 수 없습니다.', row);
        }
        root.append(row);
      }
      return root;
    },

    renderAction({ status, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = {}) {
      const root = section();
      const showValue = (label, value) => {
        if (value === undefined || value === null || value === '') return;
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return;
        make('p', `${label}: ${value}`, root);
      };
      const scalarId = (value) =>
        (typeof value === 'string' && value.length > 0) || typeof value === 'number'
          ? String(value)
          : null;
      const eventId = scalarId(event?.id);
      const currentActionId = scalarId(actionId);
      const requestId = scalarId(receipt?.requestId);
      const receiptId = scalarId(receipt?.receiptId);
      const suppliedEventId = scalarId(receipt?.eventId);
      const suppliedActionId = scalarId(receipt?.actionId);
      const intentMismatch = (suppliedEventId !== null && eventId !== null && suppliedEventId !== eventId)
        || (suppliedActionId !== null && currentActionId !== null && suppliedActionId !== currentActionId);
      const effectConfirmed = status === 'succeeded' && observation?.effectApplied === true && !intentMismatch;
      const effectiveStatus = status === 'succeeded' && !effectConfirmed ? 'unknown' : status;

      showValue('사건 ID', eventId);
      const evidenceIds = Array.isArray(event?.evidence)
        ? event.evidence.map((item) => scalarId(item?.id)).filter((id) => id !== null)
        : [];
      if (evidenceIds.length) showValue('근거 ID', evidenceIds.join(', '));
      showValue('조치 ID', actionId);
      showValue('대상 ID', target?.id);
      showValue('대상 세대', target?.generation);
      showValue('요청 ID', requestId);
      showValue('접수 ID', receiptId);
      showValue('영수증 버전', receipt?.version);

      if (effectConfirmed && eventId !== null) {
        root.setAttribute('data-student-action-event', eventId);
        if (requestId !== null) root.setAttribute('data-student-action-request', requestId);
      }

      const statusLabels = {
        idle: '아직 미실행(idle)',
        loading: '준비 또는 결과 조회 중(loading)',
        prepared: '준비됨·미실행(prepared)',
        executing: '서버에 전달 중(executing)',
        pending: '서버 접수·처리 중(pending)',
        succeeded: '효과 확인(succeeded)',
        denied: '거절(denied)',
        failed: '실패(failed)',
        unknown: '결과 불명(unknown)',
        expired: '확인 기한 지남(expired)',
        error: '요청 처리 안 됨(error)',
      };
      make('h3', statusLabels[effectiveStatus] || `확인 불가(${String(status ?? 'unknown')})`, root);

      if (effectiveStatus === 'idle') {
        make('p', '조치는 아직 미실행입니다. 현재 기록에서 지원되는 조치가 없으면 조치 준비 버튼이 나오지 않는 것이 정상입니다.', root);
      } else if (effectiveStatus === 'loading') {
        make('p', '조치 준비 또는 연동 시스템 결과 조회 중입니다. 처리 결과와 효과는 아직 확인되지 않았습니다.', root);
      } else if (effectiveStatus === 'prepared') {
        make('p', '조치가 준비되었지만 아직 서버에 전달되지 않았고 실행되지 않았습니다.', root);
        showValue('확인 기한', confirmationExpiresAt);
        make('p', '계속하려면 제공 화면에서 실제 대상과 조치를 확인하세요. 이 화면은 조치를 실행하지 않습니다.', root);
      } else if (effectiveStatus === 'executing') {
        make('p', '서버에 전달 중입니다. 처리 결과와 효과는 아직 확인되지 않았으며 완료 또는 성공을 뜻하지 않습니다.', root);
      } else if (effectiveStatus === 'pending') {
        make('p', '서버가 요청을 접수해 처리 중입니다. 접수(ACK)는 효과 확인이 아닙니다.', root);
        make('p', '처리 결과는 아직 확인되지 않았습니다. 제공 화면에서 연동 시스템 결과를 조회하세요.', root);
      } else if (effectiveStatus === 'succeeded' && effectConfirmed) {
        make('p', '연동 시스템에서 효과를 확인했습니다(effectApplied: true).', root);
        showValue('관측 시각', observation.observedAt);
      } else if (effectiveStatus === 'unknown') {
        if (status === 'succeeded' && intentMismatch) {
          make('p', '현재 사건 또는 조치와 서버 영수증의 식별자가 일치하지 않아 효과를 확인할 수 없습니다. 제공 화면에서 결과를 다시 조회하세요.', root);
        } else if (status === 'succeeded') {
          make('p', 'succeeded 상태이지만 observation.effectApplied가 true가 아니므로 효과 확인으로 표시할 수 없습니다.', root);
        } else {
          make('p', '효과가 없다고도 성공했다고도 판단할 수 없습니다. 제공 화면에서 연동 시스템 결과만 재조회하세요.', root);
        }
      } else if (effectiveStatus === 'denied' || effectiveStatus === 'failed') {
        const safe = safeError({ code: effectiveStatus, message });
        make('p', effectiveStatus === 'denied' ? '연동 시스템에서 조치 요청을 거절했습니다.' : '연동 시스템에서 조치 처리가 실패했습니다.', root);
        make('p', `메시지: ${safe.message}`, root);
      } else if (effectiveStatus === 'expired') {
        make('p', '확인 기한이 지났습니다. 제공 화면에서 조치를 다시 준비하세요.', root);
      } else if (effectiveStatus === 'error') {
        const safe = safeError(error);
        make('p', `요청이 처리되지 않았습니다 (${safe.code}): ${safe.message}`, root);
      } else {
        make('p', '조치 상태를 확인할 수 없습니다. 제공 화면에서 연동 시스템 결과만 재조회하세요.', root);
      }

      if (effectiveStatus === 'unknown' || effectiveStatus === 'pending' || effectiveStatus === 'executing') {
        make('p', '조치 화면 취소는 이미 서버에 전달된 조치 효과를 되돌리지 않습니다.', root);
      }
      return root;
    },
  };
}
