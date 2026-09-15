import streamlit as st
import plotly.graph_objects as go
from collections import deque
import time
from parser import parse_line, parse_vitals_line, ParsedData, VitalsData
from serial_reader import SerialReader, MockSerialReader, MockVitalsReader


st.set_page_config(
    page_title="TinyGest — Gesture Assistive Interface",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)


MAX_SAMPLES = 200
VITAL_MAX_SAMPLES = 300


st.markdown("""
<style>
    .status-card {
        background-color: #1E1E1E;
        border-radius: 12px;
        padding: 20px 16px;
        border: 1px solid #333;
        height: 140px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .status-card h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .status-card .value {
        margin: 0;
        font-size: 32px;
        font-weight: 700;
        line-height: 1.2;
    }
    .status-card .action-value {
        font-size: 15px;
        font-weight: 500;
        line-height: 1.4;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .vital-card {
        background-color: #1E1E1E;
        border-radius: 12px;
        padding: 20px 16px;
        border: 1px solid #333;
        height: 140px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .vital-card h4 {
        margin: 0 0 8px 0;
        font-size: 14px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    .vital-card .value {
        margin: 0;
        font-size: 36px;
        font-weight: 700;
        line-height: 1.2;
    }
    .vital-card .unit {
        font-size: 14px;
        font-weight: 400;
        color: #888;
        margin-left: 4px;
    }
    .gesture-UP { color: #28A745; }
    .gesture-DOWN { color: #DC3545; }
    .gesture-LEFT { color: #6F42C1; }
    .gesture-RIGHT { color: #FD7E14; }
    .gesture-IDLE { color: #6C757D; }
    .confidence-high { color: #28A745; }
    .confidence-med { color: #FFC107; }
    .confidence-low { color: #DC3545; }
    .relay-ON { color: #28A745; }
    .relay-OFF { color: #DC3545; }
    .action-text { color: #45B7D1; }
    .hr-text { color: #FF6B6B; }
    .spo2-text { color: #4ECDC4; }
    .ppg-text { color: #45B7D1; }
    .header-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 8px;
    }
    .header-title h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 700;
        color: #FFF;
    }
    .header-title p {
        margin: 4px 0 0 0;
        font-size: 15px;
        color: #888;
    }
    .status-badge {
        padding: 8px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
    }
    .badge-mock { background: #FFF3CD; color: #856404; border: 1px solid #FFC107; }
    .badge-connected { background: #D4EDDA; color: #155724; border: 1px solid #28A745; }
    .badge-disconnected { background: #F8D7DA; color: #721C24; border: 1px solid #DC3545; }
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 24px 0 12px 0;
    }
    .section-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #FFF;
    }
    .sensor-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
    }
    .sensor-item {
        background: #1E1E1E;
        border: 1px solid #333;
        border-radius: 10px;
        padding: 16px;
        text-align: center;
    }
    .sensor-label {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
    }
    .sensor-value {
        font-size: 24px;
        font-weight: 600;
        color: #FFF;
        font-family: 'Monospace', monospace;
    }
    .vital-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 16px;
    }
    .vital-item {
        background: #1E1E1E;
        border: 1px solid #333;
        border-radius: 10px;
        padding: 20px;
        text-align: center;
    }
    .vital-label {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
    }
    .vital-value {
        font-size: 32px;
        font-weight: 700;
        line-height: 1.2;
    }
    .info-row {
        display: flex;
        gap: 24px;
        font-size: 13px;
        color: #888;
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #333;
    }
    .info-row span { font-weight: 500; color: #CCC; }
</style>
""", unsafe_allow_html=True)


def init_session_state():
    if "serial_reader" not in st.session_state:
        st.session_state.serial_reader = None
    if "vitals_reader" not in st.session_state:
        st.session_state.vitals_reader = None
    if "mock_mode" not in st.session_state:
        st.session_state.mock_mode = True
    if "connected" not in st.session_state:
        st.session_state.connected = False
    if "vitals_connected" not in st.session_state:
        st.session_state.vitals_connected = False
    if "selected_port" not in st.session_state:
        st.session_state.selected_port = ""
    if "vitals_port" not in st.session_state:
        st.session_state.vitals_port = ""
    if "baud_rate" not in st.session_state:
        st.session_state.baud_rate = 115200
    if "vitals_baud_rate" not in st.session_state:
        st.session_state.vitals_baud_rate = 115200
    if "sensor_buffer_x" not in st.session_state:
        st.session_state.sensor_buffer_x = deque(maxlen=MAX_SAMPLES)
    if "sensor_buffer_y" not in st.session_state:
        st.session_state.sensor_buffer_y = deque(maxlen=MAX_SAMPLES)
    if "sensor_buffer_z" not in st.session_state:
        st.session_state.sensor_buffer_z = deque(maxlen=MAX_SAMPLES)
    if "time_buffer" not in st.session_state:
        st.session_state.time_buffer = deque(maxlen=MAX_SAMPLES)
    if "current_data" not in st.session_state:
        st.session_state.current_data = ParsedData()
    if "latest_action" not in st.session_state:
        st.session_state.latest_action = "Waiting for data..."
    if "error_count" not in st.session_state:
        st.session_state.error_count = 0
    if "sample_counter" not in st.session_state:
        st.session_state.sample_counter = 0
    if "graph_paused" not in st.session_state:
        st.session_state.graph_paused = False
    if "page" not in st.session_state:
        st.session_state.page = "GESTURES"
    if "vitals_hr_buffer" not in st.session_state:
        st.session_state.vitals_hr_buffer = deque(maxlen=VITAL_MAX_SAMPLES)
    if "vitals_spo2_buffer" not in st.session_state:
        st.session_state.vitals_spo2_buffer = deque(maxlen=VITAL_MAX_SAMPLES)
    if "vitals_ppg_buffer" not in st.session_state:
        st.session_state.vitals_ppg_buffer = deque(maxlen=VITAL_MAX_SAMPLES)
    if "vitals_time_buffer" not in st.session_state:
        st.session_state.vitals_time_buffer = deque(maxlen=VITAL_MAX_SAMPLES)
    if "vitals_sample_counter" not in st.session_state:
        st.session_state.vitals_sample_counter = 0
    if "vitals_graph_paused" not in st.session_state:
        st.session_state.vitals_graph_paused = False
    if "current_vitals" not in st.session_state:
        st.session_state.current_vitals = VitalsData()


def format_action(data: ParsedData) -> str:
    if not data.valid:
        return "Invalid data"
    gesture = data.gesture
    relay = "ON" if data.relay_state == 1 else "OFF"
    if gesture == "IDLE":
        return f"{gesture} → No action"
    elif gesture in ("RIGHT", "UP"):
        return f"{gesture} → Relay {relay}"
    elif gesture in ("LEFT", "DOWN"):
        return f"{gesture} → Relay {relay}"
    else:
        return f"{gesture} → Detected"


def serial_error_handler(error_msg: str):
    st.session_state.error_count += 1


def vitals_error_handler(error_msg: str):
    st.session_state.error_count += 1


def process_serial_line(line: str):
    parsed = parse_line(line)
    if parsed.valid:
        st.session_state.current_data = parsed
        st.session_state.latest_action = format_action(parsed)
        if not st.session_state.graph_paused:
            st.session_state.sensor_buffer_x.append(parsed.acc_x)
            st.session_state.sensor_buffer_y.append(parsed.acc_y)
            st.session_state.sensor_buffer_z.append(parsed.acc_z)
            st.session_state.time_buffer.append(st.session_state.sample_counter)
            st.session_state.sample_counter += 1
    else:
        parsed_v = parse_vitals_line(line)
        if parsed_v.valid:
            st.session_state.current_vitals = parsed_v
            if not st.session_state.vitals_graph_paused:
                st.session_state.vitals_hr_buffer.append(parsed_v.heart_rate)
                st.session_state.vitals_spo2_buffer.append(parsed_v.spo2)
                st.session_state.vitals_ppg_buffer.append(parsed_v.ppg_raw)
                st.session_state.vitals_time_buffer.append(st.session_state.vitals_sample_counter)
                st.session_state.vitals_sample_counter += 1
        else:
            st.session_state.error_count += 1


def connect_serial():
    if st.session_state.mock_mode:
        reader = MockSerialReader()
    else:
        reader = SerialReader(
            port=st.session_state.selected_port,
            baudrate=st.session_state.baud_rate
        )
    reader.error_callback = serial_error_handler
    if reader.connect():
        reader.start_reading(line_callback=process_serial_line)
        st.session_state.serial_reader = reader
        st.session_state.connected = True
        st.session_state.error_count = 0
        st.session_state.latest_action = "Connected - waiting for data..."
        return True
    else:
        st.session_state.connected = False
        return False


def disconnect_serial():
    if st.session_state.serial_reader:
        st.session_state.serial_reader.disconnect()
        st.session_state.serial_reader = None
    st.session_state.connected = False
    st.session_state.latest_action = "Disconnected"


def connect_vitals_serial():
    if st.session_state.mock_mode:
        reader = MockVitalsReader()
    else:
        reader = SerialReader(
            port=st.session_state.vitals_port,
            baudrate=st.session_state.vitals_baud_rate
        )
    reader.error_callback = vitals_error_handler
    if reader.connect():
        reader.start_reading(line_callback=process_serial_line)
        st.session_state.vitals_reader = reader
        st.session_state.vitals_connected = True
        st.session_state.error_count = 0
        return True
    else:
        st.session_state.vitals_connected = False
        return False


def disconnect_vitals_serial():
    if st.session_state.vitals_reader:
        st.session_state.vitals_reader.disconnect()
        st.session_state.vitals_reader = None
    st.session_state.vitals_connected = False


def create_sensor_figure():
    fig = go.Figure()
    time_data = list(st.session_state.time_buffer)
    x_data = list(st.session_state.sensor_buffer_x)
    y_data = list(st.session_state.sensor_buffer_y)
    z_data = list(st.session_state.sensor_buffer_z)

    if time_data:
        fig.add_trace(go.Scatter(
            x=time_data, y=x_data, mode='lines', name='Acc X',
            line=dict(color='#FF6B6B', width=1.5),
            hovertemplate='Sample: %{x}<br>Acc X: %{y}<extra></extra>'
        ))
        fig.add_trace(go.Scatter(
            x=time_data, y=y_data, mode='lines', name='Acc Y',
            line=dict(color='#4ECDC4', width=1.5),
            hovertemplate='Sample: %{x}<br>Acc Y: %{y}<extra></extra>'
        ))
        fig.add_trace(go.Scatter(
            x=time_data, y=z_data, mode='lines', name='Acc Z',
            line=dict(color='#45B7D1', width=1.5),
            hovertemplate='Sample: %{x}<br>Acc Z: %{y}<extra></extra>'
        ))

    fig.update_layout(
        title=None,
        xaxis_title="Sample Number",
        yaxis_title="Acceleration (raw)",
        height=380,
        margin=dict(l=50, r=20, t=10, b=40),
        legend=dict(
            orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
            font=dict(size=11, color="#CCC")
        ),
        plot_bgcolor='#141414',
        paper_bgcolor='#141414',
        font=dict(size=11, color="#CCC"),
        xaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.05)', zerolinecolor='rgba(255,255,255,0.1)'),
        yaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.05)', zerolinecolor='rgba(255,255,255,0.1)'),
        hovermode='x unified',
        hoverlabel=dict(bgcolor="#1E1E1E", font_size=11, font_color="#FFF")
    )
    return fig


def create_vitals_figure():
    fig = go.Figure()
    time_data = list(st.session_state.vitals_time_buffer)
    hr_data = list(st.session_state.vitals_hr_buffer)
    spo2_data = list(st.session_state.vitals_spo2_buffer)
    ppg_data = list(st.session_state.vitals_ppg_buffer)

    if time_data:
        fig.add_trace(go.Scatter(
            x=time_data, y=hr_data, mode='lines', name='Heart Rate (BPM)',
            line=dict(color='#FF6B6B', width=1.5),
            hovertemplate='Sample: %{x}<br>HR: %{y} BPM<extra></extra>',
            yaxis='y'
        ))
        fig.add_trace(go.Scatter(
            x=time_data, y=spo2_data, mode='lines', name='SpO2 (%)',
            line=dict(color='#4ECDC4', width=1.5),
            hovertemplate='Sample: %{x}<br>SpO2: %{y}%<extra></extra>',
            yaxis='y2'
        ))
        fig.add_trace(go.Scatter(
            x=time_data, y=ppg_data, mode='lines', name='PPG Raw',
            line=dict(color='#45B7D1', width=1),
            hovertemplate='Sample: %{x}<br>PPG: %{y}<extra></extra>',
            yaxis='y3',
            visible='legendonly'
        ))

    fig.update_layout(
        title=None,
        xaxis_title="Sample Number",
        height=380,
        margin=dict(l=50, r=20, t=10, b=40),
        legend=dict(
            orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1,
            font=dict(size=11, color="#CCC")
        ),
        plot_bgcolor='#141414',
        paper_bgcolor='#141414',
        font=dict(size=11, color="#CCC"),
        xaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.05)', zerolinecolor='rgba(255,255,255,0.1)'),
        yaxis=dict(
            title=dict(text="Heart Rate (BPM)", font=dict(color='#FF6B6B')),
            side="left",
            showgrid=True, gridcolor='rgba(255,255,255,0.05)',
            zerolinecolor='rgba(255,255,255,0.1)', range=[50, 110],
            tickfont=dict(color='#FF6B6B')
        ),
        yaxis2=dict(
            title=dict(text="SpO2 (%)", font=dict(color='#4ECDC4')),
            side="right", overlaying="y",
            showgrid=False, range=[93, 101],
            tickfont=dict(color='#4ECDC4')
        ),
        yaxis3=dict(
            title=dict(text="PPG Raw", font=dict(color='#45B7D1')),
            side="right", overlaying="y",
            showgrid=False, position=0.95,
            tickfont=dict(color='#45B7D1')
        ),
        hovermode='x unified',
        hoverlabel=dict(bgcolor="#1E1E1E", font_size=11, font_color="#FFF")
    )
    return fig


def render_header():
    data = st.session_state.current_data
    vitals = st.session_state.current_vitals
    
    if st.session_state.mock_mode:
        badge_class = "badge-mock"
        badge_text = "⚠️ DEMO / MOCK MODE"
        badge_sub = "Simulated data — not from real hardware"
    elif st.session_state.page == "GESTURES" and st.session_state.connected:
        badge_class = "badge-connected"
        badge_text = "🟢 CONNECTED"
        badge_sub = f"{st.session_state.selected_port} @ {st.session_state.baud_rate} baud"
    elif st.session_state.page == "VITALS" and st.session_state.vitals_connected:
        badge_class = "badge-connected"
        badge_text = "🟢 CONNECTED"
        badge_sub = f"{st.session_state.vitals_port} @ {st.session_state.vitals_baud_rate} baud"
    else:
        badge_class = "badge-disconnected"
        badge_text = "🔴 DISCONNECTED"
        badge_sub = ""

    st.markdown(f"""
    <div class="header-row">
        <div class="header-title">
            <h1>🤖 TinyGest</h1>
            <p>Gesture Based Assistive System</p>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end;">
            <span class="status-badge {badge_class}">{badge_text}</span>
            {f'<small style="color:#888; margin-top:4px;">{badge_sub}</small>' if badge_sub else ''}
        </div>
    </div>
    """, unsafe_allow_html=True)


def render_connection_panel():
    with st.sidebar:
        st.markdown("## 📱 Mode / Sensor")
        page = st.radio(
            "Select Page",
            options=["GESTURES", "VITALS"],
            index=0 if st.session_state.page == "GESTURES" else 1,
            horizontal=True,
            label_visibility="collapsed"
        )
        if page != st.session_state.page:
            st.session_state.page = page
            st.rerun()
        
        st.markdown("---")
        st.markdown("## 🔌 Device Connection")
        
        mock_mode = st.checkbox(
            "Demo / Mock Mode",
            value=st.session_state.mock_mode,
            help="Enable to test UI without ESP32 hardware"
        )
        
        if mock_mode != st.session_state.mock_mode:
            st.session_state.mock_mode = mock_mode
            if st.session_state.connected:
                disconnect_serial()
            if st.session_state.vitals_connected:
                disconnect_vitals_serial()
            st.rerun()
        
        if st.session_state.page == "GESTURES":
            st.markdown("### MPU6050 (Gesture)")
            if not st.session_state.mock_mode:
                ports = SerialReader.list_ports()
                port_options = ports if ports else ["No ports found"]
                
                selected = st.selectbox(
                    "COM Port",
                    options=port_options,
                    index=0 if st.session_state.selected_port not in port_options else port_options.index(st.session_state.selected_port)
                )
                st.session_state.selected_port = selected
                
                baud = st.number_input(
                    "Baud Rate", min_value=9600, max_value=921600,
                    value=st.session_state.baud_rate, step=1
                )
                st.session_state.baud_rate = baud
                
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("🔌 Connect", type="primary", disabled=st.session_state.connected, use_container_width=True):
                        if connect_serial():
                            st.success("Connected!")
                            time.sleep(0.3)
                            st.rerun()
                        else:
                            st.error("Connection failed")
                with col2:
                    if st.button("🔌 Disconnect", disabled=not st.session_state.connected, use_container_width=True):
                        disconnect_serial()
                        st.rerun()
            else:
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("🔌 Start Mock", type="primary", disabled=st.session_state.connected, use_container_width=True):
                        if connect_serial():
                            st.success("Mock started!")
                            time.sleep(0.3)
                            st.rerun()
                with col2:
                    if st.button("🔌 Stop Mock", disabled=not st.session_state.connected, use_container_width=True):
                        disconnect_serial()
                        st.rerun()
        else:
            st.markdown("### MAX30102 (Vitals)")
            if not st.session_state.mock_mode:
                ports = SerialReader.list_ports()
                port_options = ports if ports else ["No ports found"]
                
                selected = st.selectbox(
                    "COM Port",
                    options=port_options,
                    index=0 if st.session_state.vitals_port not in port_options else port_options.index(st.session_state.vitals_port)
                )
                st.session_state.vitals_port = selected
                
                baud = st.number_input(
                    "Baud Rate", min_value=9600, max_value=921600,
                    value=st.session_state.vitals_baud_rate, step=1
                )
                st.session_state.vitals_baud_rate = baud
                
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("🔌 Connect", type="primary", disabled=st.session_state.vitals_connected, use_container_width=True):
                        if connect_vitals_serial():
                            st.success("Connected!")
                            time.sleep(0.3)
                            st.rerun()
                        else:
                            st.error("Connection failed")
                with col2:
                    if st.button("🔌 Disconnect", disabled=not st.session_state.vitals_connected, use_container_width=True):
                        disconnect_vitals_serial()
                        st.rerun()
            else:
                col1, col2 = st.columns(2)
                with col1:
                    if st.button("🔌 Start Mock", type="primary", disabled=st.session_state.vitals_connected, use_container_width=True):
                        if connect_vitals_serial():
                            st.success("Mock started!")
                            time.sleep(0.3)
                            st.rerun()
                with col2:
                    if st.button("🔌 Stop Mock", disabled=not st.session_state.vitals_connected, use_container_width=True):
                        disconnect_vitals_serial()
                        st.rerun()
        
        st.markdown("---")
        
        st.markdown("### ℹ️ Info")
        if st.session_state.page == "GESTURES":
            st.markdown(f"""
            **Mode:** {'Mock/Demo' if st.session_state.mock_mode else 'Real Hardware'}  
            **Status:** {'🟢 Connected' if st.session_state.connected else '🔴 Disconnected'}  
            **Errors:** {st.session_state.error_count}  
            **Samples:** {st.session_state.sample_counter}
            """)
        else:
            st.markdown(f"""
            **Mode:** {'Mock/Demo' if st.session_state.mock_mode else 'Real Hardware'}  
            **Status:** {'🟢 Connected' if st.session_state.vitals_connected else '🔴 Disconnected'}  
            **Errors:** {st.session_state.error_count}  
            **Samples:** {st.session_state.vitals_sample_counter}
            """)
        
        with st.expander("📋 Expected Serial Format"):
            if st.session_state.page == "GESTURES":
                st.markdown("""
                **Gesture Protocol:**
                ```
                GESTURE,<label>,<conf>,RELAY,<state>,<x>,<y>,<z>
                ```
                Example:  
                `GESTURE,RIGHT,0.92,RELAY,1,1245,-532,16234`  
                **Gestures:** DOWN, IDLE, LEFT, RIGHT, UP
                """)
            else:
                st.markdown("""
                **Vitals Protocol:**
                ```
                VITALS,HR,<bpm>,SPO2,<pct>,PPG_RAW,<val>,PPG_FILT,<val>
                ```
                Example:  
                `VITALS,HR,72,SPO2,98,PPG_RAW,12500,PPG_FILT,12400`
                """)


def render_status_cards():
    data = st.session_state.current_data
    
    col1, col2, col3, col4 = st.columns(4, gap="medium")
    
    with col1:
        if data.valid and data.gesture:
            g_class = f"gesture-{data.gesture}"
            gesture_val = f'<span class="value {g_class}">{data.gesture}</span>'
        else:
            gesture_val = '<span class="value" style="color:#6C757D;">—</span>'
        st.markdown(f"""
        <div class="status-card">
            <h4>Current Gesture</h4>
            {gesture_val}
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        if data.valid and data.confidence is not None:
            conf_pct = int(data.confidence * 100)
            conf_class = "confidence-high" if conf_pct >= 80 else "confidence-med" if conf_pct >= 60 else "confidence-low"
            conf_val = f'<span class="value {conf_class}">{conf_pct}%</span>'
        else:
            conf_val = '<span class="value" style="color:#6C757D;">N/A</span>'
        st.markdown(f"""
        <div class="status-card">
            <h4>Confidence</h4>
            {conf_val}
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        if data.valid and data.relay_state is not None:
            relay_on = data.relay_state == 1
            r_class = "relay-ON" if relay_on else "relay-OFF"
            relay_val = f'<span class="value {r_class}">{"ON" if relay_on else "OFF"}</span>'
        else:
            relay_val = '<span class="value" style="color:#6C757D;">—</span>'
        st.markdown(f"""
        <div class="status-card">
            <h4>Relay Status</h4>
            {relay_val}
        </div>
        """, unsafe_allow_html=True)
    
    with col4:
        action = st.session_state.latest_action
        st.markdown(f"""
        <div class="status-card">
            <h4>Latest Action</h4>
            <p class="value action-value action-text">{action}</p>
        </div>
        """, unsafe_allow_html=True)


def render_vitals_cards():
    v = st.session_state.current_vitals
    
    col1, col2, col3 = st.columns(3, gap="medium")
    
    with col1:
        hr = v.heart_rate if v.valid and v.heart_rate else "—"
        st.markdown(f"""
        <div class="vital-card">
            <h4>Heart Rate</h4>
            <span class="value hr-text">{hr}<span class="unit">BPM</span></span>
        </div>
        """, unsafe_allow_html=True)
    
    with col2:
        spo2 = v.spo2 if v.valid and v.spo2 else "—"
        st.markdown(f"""
        <div class="vital-card">
            <h4>SpO₂</h4>
            <span class="value spo2-text">{spo2}<span class="unit">%</span></span>
        </div>
        """, unsafe_allow_html=True)
    
    with col3:
        ppg = v.ppg_raw if v.valid and v.ppg_raw else "—"
        st.markdown(f"""
        <div class="vital-card">
            <h4>PPG Signal</h4>
            <span class="value ppg-text">{ppg}</span>
        </div>
        """, unsafe_allow_html=True)


def render_mpu6050_section():
    data = st.session_state.current_data
    
    st.markdown("""
    <div class="section-header">
        <h3>MPU6050 Live Accelerometer Data</h3>
    </div>
    """, unsafe_allow_html=True)
    
    col_pause, col_clear, _ = st.columns([1, 1, 6])
    with col_pause:
        if st.button("⏸️ Pause" if not st.session_state.graph_paused else "▶️ Resume", key="pause_btn", use_container_width=True):
            st.session_state.graph_paused = not st.session_state.graph_paused
            st.rerun()
    with col_clear:
        if st.button("🗑️ Clear Graph", key="clear_btn", use_container_width=True):
            st.session_state.sensor_buffer_x.clear()
            st.session_state.sensor_buffer_y.clear()
            st.session_state.sensor_buffer_z.clear()
            st.session_state.time_buffer.clear()
            st.session_state.sample_counter = 0
            st.rerun()
    
    acc_x = data.acc_x if data.valid and data.acc_x is not None else "—"
    acc_y = data.acc_y if data.valid and data.acc_y is not None else "—"
    acc_z = data.acc_z if data.valid and data.acc_z is not None else "—"
    
    st.markdown(f"""
    <div class="sensor-grid">
        <div class="sensor-item">
            <div class="sensor-label">Acc X</div>
            <div class="sensor-value">{acc_x}</div>
        </div>
        <div class="sensor-item">
            <div class="sensor-label">Acc Y</div>
            <div class="sensor-value">{acc_y}</div>
        </div>
        <div class="sensor-item">
            <div class="sensor-label">Acc Z</div>
            <div class="sensor-value">{acc_z}</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    fig = create_sensor_figure()
    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})


def render_vitals_section():
    v = st.session_state.current_vitals
    
    st.markdown("""
    <div class="section-header">
        <h3>MAX30102 Live Vitals Data</h3>
    </div>
    """, unsafe_allow_html=True)
    
    col_pause, col_clear, _ = st.columns([1, 1, 6])
    with col_pause:
        if st.button("⏸️ Pause" if not st.session_state.vitals_graph_paused else "▶️ Resume", key="vitals_pause_btn", use_container_width=True):
            st.session_state.vitals_graph_paused = not st.session_state.vitals_graph_paused
            st.rerun()
    with col_clear:
        if st.button("🗑️ Clear Graph", key="vitals_clear_btn", use_container_width=True):
            st.session_state.vitals_hr_buffer.clear()
            st.session_state.vitals_spo2_buffer.clear()
            st.session_state.vitals_ppg_buffer.clear()
            st.session_state.vitals_time_buffer.clear()
            st.session_state.vitals_sample_counter = 0
            st.rerun()
    
    st.markdown(f"""
    <div class="vital-grid">
        <div class="vital-item">
            <div class="vital-label">Heart Rate</div>
            <div class="vital-value hr-text">{v.heart_rate if v.valid and v.heart_rate else '—'}</div>
        </div>
        <div class="vital-item">
            <div class="vital-label">SpO₂</div>
            <div class="vital-value spo2-text">{v.spo2 if v.valid and v.spo2 else '—'}</div>
        </div>
        <div class="vital-item">
            <div class="vital-label">PPG Raw</div>
            <div class="vital-value ppg-text">{v.ppg_raw if v.valid and v.ppg_raw else '—'}</div>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    fig = create_vitals_figure()
    st.plotly_chart(fig, use_container_width=True, config={'displayModeBar': False})
    
    st.markdown(f"""
    <div class="info-row">
        <span>Samples:</span> {st.session_state.vitals_sample_counter}
        <span>Errors:</span> {st.session_state.error_count}
        <span>Buffer:</span> {len(st.session_state.vitals_time_buffer)}/{VITAL_MAX_SAMPLES}
        <span>Status:</span> {'Paused' if st.session_state.vitals_graph_paused else 'Live'}
    </div>
    """, unsafe_allow_html=True)





def process_queued_lines():
    if st.session_state.serial_reader:
        lines = st.session_state.serial_reader.get_all_lines()
        for line in lines:
            process_serial_line(line)
    if st.session_state.vitals_reader:
        lines = st.session_state.vitals_reader.get_all_lines()
        for line in lines:
            process_serial_line(line)


def main():
    init_session_state()
    
    if st.session_state.connected or st.session_state.vitals_connected:
        process_queued_lines()
    
    render_header()
    render_connection_panel()
    
    st.markdown("---")
    
    if st.session_state.page == "GESTURES":
        render_status_cards()
        st.markdown("---")
        render_mpu6050_section()
    else:
        render_vitals_cards()
        st.markdown("---")
        render_vitals_section()
    
    if st.session_state.connected or st.session_state.vitals_connected:
        time.sleep(0.1)
        st.rerun()


if __name__ == "__main__":
    main()