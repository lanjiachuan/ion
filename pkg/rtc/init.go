package rtc

import (
	"time"

	"github.com/pion/ion/pkg/log"
	"github.com/pion/ion/pkg/rtc/rtpengine"
)

const (
	statCycle = 3 * time.Second
)

var (

	//CleanChannel return the dead pub's mid
	CleanChannel = make(chan string)
)

// Init init port and ice urls
func Init(port int, ices []string) {

	//init ice
	initICE(ices)

	// show stat about all pipelines
	go stat()

	// accept relay conn
	connCh := rtpengine.Serve(port)
	go func() {
		for {
			select {
			case conn := <-connCh:
				t := newRTPTransport(conn)
				if t != nil {
					t.receiveRTP()
				}
				mid := t.getMID()
				cnt := 0
				for mid == "" && cnt < 10 {
					mid = t.getMID()
					time.Sleep(time.Millisecond)
					cnt++
				}
				if mid == "" && cnt >= 10 {
					log.Infof("mid == \"\" && cnt >=10 return")
					return
				}
				log.Infof("accept new rtp mid=%s conn=%s", mid, conn.RemoteAddr().String())
				if p := newPipeline(mid); p != nil {
					p.addPub(mid, t)
				}
			}
		}
	}()
}
