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
    renderDecision() { return '학생 구현 대기: 서버의 판정과 이유를 연결하세요.'; },
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
