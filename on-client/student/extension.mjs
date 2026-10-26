// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.
export function createStudentView() {
  return {
    renderIdentity({ me, devices, sessions } = {}) {
      const root = document.createElement('section');
      const addText = (parent, tag, value) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        parent.append(node);
        return node;
      };
      const modeLabel = (mode) => ({
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      })[mode] || '확인 불가';
      const statusLabel = (kind, status) => {
        const labels = {
          device: {
            compliant: '보안 기준 충족',
            noncompliant: '보안 기준 미충족',
            unknown: '확인 불가',
          },
          session: {
            active: '활성',
            expired: '만료',
            revoked: '철회됨',
            unknown: '확인 불가',
          },
        };
        const code = typeof status === 'string' ? status : 'unknown';
        return `${labels[kind][code] || '확인 불가'} (${code})`;
      };
      const addResource = (title, resource, renderData) => {
        const section = document.createElement('section');
        addText(section, 'h3', title);
        if (!resource || resource.status === 'loading') {
          addText(section, 'p', '불러오는 중');
        } else if (resource.status === 'error') {
          const message = typeof resource.error?.message === 'string' && resource.error.message
            ? resource.error.message
            : '서버에서 오류 내용을 제공하지 않았습니다.';
          addText(section, 'p', `연결 실패: ${message}`);
        } else if (resource.status === 'ok') {
          renderData(section, resource.data);
        } else {
          addText(section, 'p', '확인 불가');
        }
        if (resource?.mode) addText(section, 'p', modeLabel(resource.mode));
        root.append(section);
      };

      addResource('계정·현재 기기·로그인 세션', me, (section, data) => {
        const user = data?.user;
        const device = data?.device;
        const session = data?.session;
        addText(section, 'p', `사용자: ${user?.label || '확인 불가'} · ID: ${user?.id || '확인 불가'}`);
        addText(section, 'p', `현재 기기: ${device?.label || '확인 불가'} · ID: ${device?.id || '확인 불가'} · ${statusLabel('device', device?.status)}`);
        addText(section, 'p', `현재 로그인 세션: ID ${session?.id || '확인 불가'} · ${statusLabel('session', session?.status)}`);
      });

      addResource('기기', devices, (section, data) => {
        if (!Array.isArray(data) || data.length === 0) {
          addText(section, 'p', '표시할 기기가 없습니다.');
          return;
        }
        for (const device of data) {
          addText(section, 'p', `${device?.label || '확인 불가'} · ID: ${device?.id || '확인 불가'} · ${statusLabel('device', device?.status)}`);
        }
      });

      addResource('세션', sessions, (section, data) => {
        if (!Array.isArray(data) || data.length === 0) {
          addText(section, 'p', '표시할 세션이 없습니다.');
          return;
        }
        for (const session of data) {
          addText(section, 'p', `ID: ${session?.id || '확인 불가'} · ${statusLabel('session', session?.status)}`);
        }
      });
      return root;
    },
    renderDecision({ status, data, error, appId } = {}) {
      const root = document.createElement('section');
      const addText = (tag, value) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        root.append(node);
        return node;
      };
      const resolvedAppId = typeof data?.appId === 'string' && data.appId
        ? data.appId
        : typeof appId === 'string' && appId ? appId : '확인 불가';

      if (status === 'idle') {
        addText('p', '앱을 골라 접속을 요청하세요.');
        return root;
      }
      addText('p', `업무 앱 ID: ${resolvedAppId}`);

      if (status === 'loading') {
        addText('p', '판정 확인 중');
        return root;
      }
      if (status === 'error') {
        const message = typeof error?.message === 'string' && error.message.trim()
          ? error.message
          : '서버에서 오류 내용을 제공하지 않았습니다.';
        addText('p', `요청 실패: ${message}`);
        addText('p', '요청 실패는 접근 거부 판정이 아닙니다.');
        return root;
      }
      if (status !== 'ok') {
        addText('p', '판정 확인 불가(unknown)');
        return root;
      }

      const decisionLabels = {
        allow: '허용',
        deny: '거부',
        challenge: '추가 확인 필요',
        unknown: '확인 불가',
      };
      const receivedDecision = typeof data?.decision === 'string' ? data.decision : 'unknown';
      const decisionCode = Object.hasOwn(decisionLabels, receivedDecision) ? receivedDecision : 'unknown';
      addText('p', `접근 판정: ${decisionLabels[decisionCode]} (${decisionCode})`);
      if (decisionCode === 'allow') {
        addText('p', '정책상 접근 허용이며 실제 업무 앱 접속 성공을 보장하지 않습니다.');
      }
      if (decisionCode === 'challenge') {
        addText('p', '이 앱은 추가 인증 또는 확인 절차를 대신 수행하지 않습니다.');
      }
      if (decisionCode === 'unknown') {
        addText('p', '허용 여부를 확인할 수 없습니다. 허용으로 간주하지 마세요.');
      }
      addText('p', `판정 이유: ${typeof data?.reason === 'string' && data.reason ? data.reason : '확인 불가'}`);
      addText('p', `판정 시각: ${typeof data?.checkedAt === 'string' && data.checkedAt ? data.checkedAt : '확인 불가'}`);
      return root;
    },
    renderEvents({ status, mode, data, error } = {}) {
      const root = document.createElement('section');
      const addText = (parent, tag, value) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        parent.append(node);
        return node;
      };
      const errorMessage = typeof error?.message === 'string' && error.message
        ? error.message
        : '서버에서 오류 내용을 제공하지 않았습니다.';

      if (status === 'loading') {
        addText(root, 'p', '기록을 불러오는 중');
        return root;
      }
      if (status === 'error') {
        if (error?.code === 'CONTRACT_MISMATCH' || error?.code === 'ENGINE_RESULT_UNVERIFIED') {
          addText(root, 'p', `확인 불가: ${errorMessage}`);
        } else {
          addText(root, 'p', `기록을 불러오지 못했습니다: ${errorMessage}`);
        }
        return root;
      }
      if (status !== 'ok') {
        addText(root, 'p', '확인 불가: 기록 상태를 확인할 수 없습니다.');
        return root;
      }
      if (!Array.isArray(data)) {
        addText(root, 'p', '확인 불가: 기록 데이터 형식이 올바르지 않습니다.');
        return root;
      }

      // 새 renderEvents 호출은 새 목록·필터·상세 상태로 시작한다. 정렬은 복사본에만 적용한다.
      const events = data.slice().sort((left, right) => {
        const leftTime = Date.parse(left?.at);
        const rightTime = Date.parse(right?.at);
        if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return rightTime - leftTime;
        return String(right?.at ?? '').localeCompare(String(left?.at ?? ''));
      });
      const filters = { kind: 'all', appId: 'all', access: 'all' };
      let selectedEventId = null;
      const kindLabels = { access: '접속 기록', xdr: 'XDR 경보' };
      const stateLabels = {
        access: { allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' },
        session: { active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' },
        device: { compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' },
      };
      const stateText = (kind, value) => {
        const code = typeof value === 'string' && value ? value : 'unknown';
        return `${stateLabels[kind]?.[code] || '확인 불가'} (${code})`;
      };
      const distinctValues = (getValue) => [...new Set(events
        .map(getValue)
        .filter((value) => typeof value === 'string' && value.length > 0))];
      const filterValues = {
        kind: distinctValues((event) => event.kind),
        appId: distinctValues((event) => event.appId),
        access: distinctValues((event) => event.state?.access),
      };
      const optionLabel = (filterKey, value) => {
        if (filterKey === 'kind') return `${kindLabels[value] || '확인 불가'} (${value})`;
        if (filterKey === 'access') return stateText('access', value);
        return value;
      };

      const renderDetails = (event) => {
        const detail = document.createElement('section');
        detail.setAttribute('data-student-event-detail', String(event.id));
        detail.setAttribute('id', 'student-event-detail-panel');
        addText(detail, 'h3', `${event.id} 상세`);
        addText(detail, 'p', `사건 ID: ${event.id}`);
        addText(detail, 'p', `업무 앱: ${typeof event.appId === 'string' && event.appId ? event.appId : '앱 확인 불가 (appId 없음)'}`);

        addText(detail, 'h4', '근거');
        if (Array.isArray(event.evidence) && event.evidence.length > 0) {
          const evidenceList = document.createElement('ul');
          for (const evidence of event.evidence) {
            addText(evidenceList, 'li', `${evidence?.id ?? 'ID 확인 불가'} — ${evidence?.text ?? ''}`);
          }
          detail.append(evidenceList);
        } else {
          addText(detail, 'p', '근거가 없습니다.');
        }

        addText(detail, 'h4', '규칙');
        if (Array.isArray(event.rules) && event.rules.length > 0) {
          const rulesList = document.createElement('ul');
          for (const rule of event.rules) {
            addText(rulesList, 'li', `${rule?.id ?? 'ID 확인 불가'} — ${rule?.text ?? ''}`);
          }
          detail.append(rulesList);
        } else {
          addText(detail, 'p', '규칙이 없습니다.');
        }

        addText(detail, 'h4', '상태');
        addText(detail, 'p', `접속: ${stateText('access', event.state?.access)}`);
        addText(detail, 'p', `세션: ${stateText('session', event.state?.session)}`);
        addText(detail, 'p', `기기: ${stateText('device', event.state?.device)}`);
        const unsupportedActions = Array.isArray(event.supportedActions)
          ? event.supportedActions.filter((action) => typeof action === 'string' && action.length > 0)
          : [];
        if (unsupportedActions.length > 0) {
          addText(detail, 'h4', '미지원 조치');
          addText(detail, 'p', '조치 실행 연결은 준비 중입니다. 이 안내는 조치 요청을 보내지 않습니다.');
          for (const action of unsupportedActions) {
            const actionButton = document.createElement('button');
            actionButton.setAttribute('type', 'button');
            actionButton.textContent = `${action} 미지원`;
            actionButton.disabled = true;
            detail.append(actionButton);
          }
        }
        return detail;
      };

      const draw = () => {
        root.replaceChildren();
        const filterGroup = document.createElement('div');
        filterGroup.setAttribute('class', 'student-event-filters');
        const addFilter = (filterKey, accessibleName) => {
          const label = document.createElement('label');
          label.textContent = `${accessibleName}: `;
          const select = document.createElement('select');
          select.setAttribute('aria-label', accessibleName);
          const allOption = document.createElement('option');
          allOption.value = 'all';
          allOption.textContent = '전체';
          select.append(allOption);
          for (const value of filterValues[filterKey]) {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = optionLabel(filterKey, value);
            select.append(option);
          }
          select.value = filters[filterKey];
          select.addEventListener('change', () => {
            filters[filterKey] = select.value;
            draw();
          });
          label.append(select);
          filterGroup.append(label);
        };
        addFilter('kind', '기록 종류');
        addFilter('appId', '업무 앱');
        addFilter('access', '접속 상태');
        root.append(filterGroup);

        const visibleEvents = events.filter((event) =>
          (filters.kind === 'all' || event.kind === filters.kind)
          && (filters.appId === 'all' || event.appId === filters.appId)
          && (filters.access === 'all' || event.state?.access === filters.access));
        if (!visibleEvents.some((event) => event.id === selectedEventId)) selectedEventId = null;
        addText(root, 'p', `표시 건수: ${visibleEvents.length}건 / 전체 ${events.length}건`);

        const eventList = document.createElement('ul');
        for (const event of visibleEvents) {
          const row = document.createElement('li');
          row.setAttribute('data-student-event-id', String(event.id));
          addText(row, 'p', `사건 ID: ${event.id}`);
          addText(row, 'p', `시각: ${event.at}`);
          const kindText = kindLabels[event.kind] || '확인 불가';
          addText(row, 'p', `기록 종류: ${kindText} (${event.kind})`);
          addText(row, 'p', `업무 앱: ${typeof event.appId === 'string' && event.appId ? event.appId : '앱 확인 불가 (appId 없음)'}`);
          addText(row, 'p', `요약: ${event.summary ?? ''}`);
          const detailButton = document.createElement('button');
          detailButton.setAttribute('type', 'button');
          detailButton.setAttribute('aria-expanded', String(selectedEventId === event.id));
          detailButton.setAttribute('aria-controls', 'student-event-detail-panel');
          detailButton.textContent = `${event.id} 상세`;
          detailButton.addEventListener('click', () => {
            selectedEventId = selectedEventId === event.id ? null : event.id;
            draw();
          });
          row.append(detailButton);
          eventList.append(row);
        }
        root.append(eventList);

        if (visibleEvents.length === 0) {
          addText(root, 'p', events.length === 0 ? '표시할 기록이 없습니다.' : '필터 조건에 맞는 기록이 없습니다.');
        }
        if (selectedEventId !== null) {
          const selectedEvent = events.find((event) => event.id === selectedEventId);
          if (selectedEvent) root.append(renderDetails(selectedEvent));
        }
      };

      draw();
      return root;
    },
    renderStatus({ devices, sessions, notifications, diagnostics, mode } = {}) {
      const root = document.createElement('section');
      const addText = (parent, tag, value) => {
        const node = document.createElement(tag);
        node.textContent = String(value);
        parent.append(node);
        return node;
      };
      const primitiveText = (value, fallback = '확인 불가') => {
        if (typeof value === 'string' && value.length > 0) return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        return fallback;
      };
      const modeLabels = {
        connected: '연결됨',
        demo: '예제 자료',
        disconnected: '연결 없음',
        unknown: '확인 불가',
      };
      addText(root, 'p', `연결 모드: ${modeLabels[mode] || '확인 불가'}`);

      const statusLabels = {
        device: {
          compliant: '보안 기준 충족',
          noncompliant: '보안 기준 미충족',
          unknown: '확인 불가',
        },
        session: {
          active: '활성',
          expired: '만료',
          revoked: '철회됨',
          unknown: '확인 불가',
        },
      };
      const describeStatus = (kind, value) => {
        const code = typeof value === 'string' && value ? value : 'unknown';
        return `${statusLabels[kind][code] || '확인 불가'} (${code})`;
      };
      const errorText = (resource, section, title) => {
        const message = typeof resource?.error?.message === 'string' && resource.error.message.trim()
          ? resource.error.message
          : '서버에서 오류 내용을 제공하지 않았습니다.';
        const errorCode = typeof resource?.error?.code === 'string' ? resource.error.code : '';
        const timedOut = /TIME.?OUT|TIMED.?OUT/i.test(errorCode)
          || /시간 초과|timed out|timeout/i.test(message);
        addText(section, 'p', timedOut
          ? `${title} 조회 시간 초과: ${message}`
          : `${title} 정보를 불러오지 못했습니다: ${message}`);
        addText(section, 'p', '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');
      };
      const addResource = (title, resource, kind) => {
        const section = document.createElement('section');
        addText(section, 'h3', title);
        if (kind === 'sessions') {
          addText(section, 'p', '세션은 현재 검증된 연결 한 개만 표시하며, 과거 세션 전체 목록이 아닙니다.');
        }
        if (!resource || resource.status === 'loading') {
          addText(section, 'p', `${title} 정보를 불러오는 중입니다.`);
        } else if (resource.status === 'error') {
          errorText(resource, section, title);
        } else if (resource.status === 'ok') {
          if (!Array.isArray(resource.data)) {
            addText(section, 'p', `${title} 목록을 확인할 수 없습니다. 응답 형식이 올바르지 않습니다.`);
          } else if (resource.data.length === 0) {
            addText(section, 'p', kind === 'devices' ? '등록된 기기가 없습니다.' : '현재 연결이 없습니다.');
          } else if (kind === 'devices') {
            for (const device of resource.data) {
              addText(section, 'p', `기기: ${primitiveText(device?.label)} · 상태: ${describeStatus('device', device?.status)}`);
            }
          } else {
            for (const session of resource.data) {
              addText(section, 'p', `세션 ID: ${primitiveText(session?.id)} · 상태: ${describeStatus('session', session?.status)}`);
            }
          }
        } else {
          addText(section, 'p', `${title} 상태를 확인할 수 없습니다.`);
        }
        root.append(section);
      };

      addResource('기기', devices, 'devices');
      addResource('세션', sessions, 'sessions');

      const notificationSection = document.createElement('section');
      addText(notificationSection, 'h3', '알림');
      if (!Array.isArray(notifications)) {
        addText(notificationSection, 'p', '알림 정보를 확인할 수 없습니다.');
      } else if (notifications.length === 0) {
        addText(notificationSection, 'p', '주의할 알림이 없습니다.');
      } else {
        for (const notification of notifications) {
          addText(notificationSection, 'p', `자료: ${primitiveText(notification?.resource)} · 코드: ${primitiveText(notification?.code)}`);
          addText(notificationSection, 'p', `메시지: ${primitiveText(notification?.message, '메시지 없음')}`);
        }
      }
      root.append(notificationSection);

      const diagnosticsSection = document.createElement('section');
      addText(diagnosticsSection, 'h3', '진단 정보');
      let safeDiagnostics = null;
      if (!diagnostics || diagnostics.status === 'loading') {
        addText(diagnosticsSection, 'p', '진단 정보를 불러오는 중입니다.');
      } else if (diagnostics.status === 'error') {
        const message = typeof diagnostics.error?.message === 'string' && diagnostics.error.message.trim()
          ? diagnostics.error.message
          : '서버에서 오류 내용을 제공하지 않았습니다.';
        addText(diagnosticsSection, 'p', `진단 정보를 불러오지 못했습니다: ${message}`);
        addText(diagnosticsSection, 'p', '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.');
      } else if (diagnostics.status === 'ok' && diagnostics.data && typeof diagnostics.data === 'object') {
        const engine = diagnostics.data.engine && typeof diagnostics.data.engine === 'object'
          ? diagnostics.data.engine
          : {};
        safeDiagnostics = {
          requestId: primitiveText(diagnostics.data.requestId),
          component: primitiveText(diagnostics.data.component),
          version: primitiveText(diagnostics.data.version),
          checkedAt: primitiveText(diagnostics.data.checkedAt),
          engine: {
            mode: primitiveText(engine.mode),
            code: primitiveText(engine.code),
          },
        };
        addText(diagnosticsSection, 'p', `요청 ID: ${safeDiagnostics.requestId}`);
        addText(diagnosticsSection, 'p', `구성 요소: ${safeDiagnostics.component}`);
        addText(diagnosticsSection, 'p', `버전: ${safeDiagnostics.version}`);
        addText(diagnosticsSection, 'p', `점검 시각: ${safeDiagnostics.checkedAt}`);
        addText(diagnosticsSection, 'p', `엔진 모드: ${safeDiagnostics.engine.mode}`);
        addText(diagnosticsSection, 'p', `엔진 코드: ${safeDiagnostics.engine.code}`);
      } else {
        addText(diagnosticsSection, 'p', '진단 정보를 확인할 수 없습니다.');
      }
      root.append(diagnosticsSection);

      addText(root, 'p', '도움정보는 도움 요청에 사용하도록 복사합니다. 비밀값은 복사하지 않습니다.');
      const copyButton = document.createElement('button');
      copyButton.setAttribute('type', 'button');
      copyButton.textContent = '도움정보 복사';
      copyButton.disabled = safeDiagnostics === null;
      root.append(copyButton);
      const copyStatus = addText(root, 'p', '');
      copyStatus.setAttribute('role', 'status');
      copyStatus.setAttribute('aria-live', 'polite');
      if (safeDiagnostics !== null) {
        copyButton.addEventListener('click', async () => {
          try {
            const clipboard = globalThis.navigator?.clipboard;
            if (!clipboard || typeof clipboard.writeText !== 'function') {
              throw new Error('CLIPBOARD_UNAVAILABLE');
            }
            await clipboard.writeText(JSON.stringify(safeDiagnostics, null, 2));
            copyStatus.textContent = '비밀 없는 도움정보를 복사했습니다.';
          } catch {
            copyStatus.textContent = '도움정보를 복사하지 못했습니다. 브라우저의 복사 권한을 확인하세요.';
          }
        });
      }
      return root;
    },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
