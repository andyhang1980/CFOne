import{connect}from"cloudflare:sockets";
const __T=["Li4u","MTA0LjE2LjAuMDo0NDMj5LyY6YCJLTAx","MTA0LjE3LjAuMDo0NDMj5LyY6YCJLTAy","MTA0LjE4LjAuMDo0NDMj5LyY6YCJLTAz","MTA0LjE5LjAuMDo0NDMj5LyY6YCJLTA0","MTA0LjIwLjAuMDo0NDMj5LyY6YCJLTA1","MTA0LjIxLjAuMDo0NDMj5LyY6YCJLTA2","MTA0LjIyLjAuMDo0NDMj5LyY6YCJLTA3","MTA0LjI0LjAuMDo0NDMj5LyY6YCJLTA4","MTA0LjI1LjAuMDo0NDMj5LyY6YCJLTA5","MTA0LjI2LjAuMDo0NDMj5LyY6YCJLTEw","MTA0LjI3LjAuMDo0NDMj5LyY6YCJLTEx","MTcyLjY2LjAuMDo0NDMj5LyY6YCJLTEy","MTcyLjY3LjAuMDo0NDMj5LyY6YCJLTEz","MTYyLjE1OS4wLjA6NDQzI+S8mOmAiS0xNA==","Q0ZPbmU=","Q0ZPbmUt","IvCfmoAg6IqC54K56YCJ5oupIg==","IuKZu++4jyDoh6rliqjpgInmi6ki","8J+agCDoioLngrnpgInmi6k=","PCFET0NUWVBFIGh0bWw+PGh0bWwgbGFuZz0iemgtQ04iPjxoZWFkPjxtZXRhIGNoYXJzZXQ9InV0Zi04Ij48bWV0YSBuYW1lPSJ2aWV3cG9ydCIgY29udGVudD0id2lkdGg9ZGV2aWNlLXdpZHRoLGluaXRpYWwtc2NhbGU9MSI+PHRpdGxlPldlbGNvbWU8L3RpdGxlPjxzdHlsZT5ib2R5e2ZvbnQtZmFtaWx5OnN5c3RlbS11aSwtYXBwbGUtc3lzdGVtLFNlZ29lIFVJLFJvYm90byxzYW5zLXNlcmlmO2Rpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OmNlbnRlcjttaW4taGVpZ2h0OjEwMHZoO21hcmdpbjowO2JhY2tncm91bmQ6I2Y2ZjdmOTtjb2xvcjojMzMzfWgxe2ZvbnQtd2VpZ2h0OjYwMDtmb250LXNpemU6MS42cmVtO2xldHRlci1zcGFjaW5nOi41cHh9bWFpbnt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjJyZW19PC9zdHlsZT48L2hlYWQ+PGJvZHk+PG1haW4+PGgxPldlbGNvbWUgdG8gQ2xvdWRmbGFyZTwvaDE+PHA+VGhpcyBzaXRlIGlzIHJ1bm5pbmcgb24gQ2xvdWRmbGFyZS48L3A+PC9tYWluPjwvYm9keT48L2h0bWw+","CjwhRE9DVFlQRSBodG1sPgo8aHRtbCBsYW5nPSJ6aC1DTiI+CjxoZWFkPgo8bWV0YSBjaGFyc2V0PSJ1dGYtOCI+CjxtZXRhIG5hbWU9InZpZXdwb3J0IiBjb250ZW50PSJ3aWR0aD1kZXZpY2Utd2lkdGgsaW5pdGlhbC1zY2FsZT0xIj4KPHRpdGxlPkNGT25lIMK3IOeuoeeQhumdouadvzwvdGl0bGU+CjxzdHlsZT4KOnJvb3R7LS1iZzojMGYxMTE1Oy0tY2FyZDojMTcxYTIxOy0tbGluZTojMjYyYjM2Oy0tdGV4dDojZTZlOGVlOy0tbXV0ZWQ6IzhiOTNhNzstLWFjYzojNGY4Y2ZmOy0tb2s6IzNmYjY4YjstLXdhcm46I2U1YTU0YjstLWVycjojZTA1ZDVkfQoqe2JveC1zaXppbmc6Ym9yZGVyLWJveH1ib2R5e21hcmdpbjowO2JhY2tncm91bmQ6dmFyKC0tYmcpO2NvbG9yOnZhcigtLXRleHQpO2ZvbnQtZmFtaWx5OnN5c3RlbS11aSwtYXBwbGUtc3lzdGVtLCJTZWdvZSBVSSIsUm9ib3RvLHNhbnMtc2VyaWY7Zm9udC1zaXplOjE0cHh9Ci53cmFwe21heC13aWR0aDo4ODBweDttYXJnaW46MCBhdXRvO3BhZGRpbmc6MjRweCAxNnB4IDgwcHh9Cmgxe2ZvbnQtc2l6ZToxLjI1cmVtO21hcmdpbjowIDAgNHB4fWgye2ZvbnQtc2l6ZToxcmVtO21hcmdpbjowIDAgMTJweDtjb2xvcjp2YXIoLS1hY2MpfQouY2FyZHtiYWNrZ3JvdW5kOnZhcigtLWNhcmQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMnB4O3BhZGRpbmc6MThweDttYXJnaW4tYm90dG9tOjE2cHh9Ci5ncmlke2Rpc3BsYXk6Z3JpZDtncmlkLXRlbXBsYXRlLWNvbHVtbnM6MWZyIDFmcjtnYXA6MTRweH0KQG1lZGlhKG1heC13aWR0aDo2NDBweCl7LmdyaWR7Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOjFmcn19CmxhYmVse2Rpc3BsYXk6YmxvY2s7bWFyZ2luOjEwcHggMCA0cHg7Y29sb3I6dmFyKC0tbXV0ZWQpO2ZvbnQtc2l6ZToxMnB4fQppbnB1dCxzZWxlY3QsdGV4dGFyZWF7d2lkdGg6MTAwJTtwYWRkaW5nOjlweCAxMHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDojMTAxMzFhO2NvbG9yOnZhcigtLXRleHQpO2ZvbnQtc2l6ZToxM3B4fQp0ZXh0YXJlYXtyZXNpemU6dmVydGljYWw7bWluLWhlaWdodDo5MHB4O2ZvbnQtZmFtaWx5OnVpLW1vbm9zcGFjZSxDb25zb2xhcyxtb25vc3BhY2V9Ci5yb3d7ZGlzcGxheTpmbGV4O2dhcDo4cHg7YWxpZ24taXRlbXM6Y2VudGVyO21hcmdpbi10b3A6MTRweH0KYnV0dG9ue3BhZGRpbmc6OXB4IDE2cHg7Ym9yZGVyOjA7Ym9yZGVyLXJhZGl1czo4cHg7YmFja2dyb3VuZDp2YXIoLS1hY2MpO2NvbG9yOiNmZmY7Zm9udC1zaXplOjEzcHg7Y3Vyc29yOnBvaW50ZXJ9CmJ1dHRvbi5naG9zdHtiYWNrZ3JvdW5kOiMyMzI4Mzh9YnV0dG9uLm9re2JhY2tncm91bmQ6dmFyKC0tb2spfWJ1dHRvbi53YXJue2JhY2tncm91bmQ6dmFyKC0td2Fybil9YnV0dG9uOmRpc2FibGVke29wYWNpdHk6LjU7Y3Vyc29yOmRlZmF1bHR9Ci5tdXRlZHtjb2xvcjp2YXIoLS1tdXRlZCl9LmVycntjb2xvcjp2YXIoLS1lcnIpfS5va2N7Y29sb3I6dmFyKC0tb2spfQpwcmV7YmFja2dyb3VuZDojMGMwZTEzO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czo4cHg7cGFkZGluZzoxMHB4O2ZvbnQtc2l6ZToxMnB4O292ZXJmbG93OmF1dG87Y29sb3I6dmFyKC0tdGV4dCl9Ci5oaWRkZW57ZGlzcGxheTpub25lfQpjb2Rle2JhY2tncm91bmQ6IzEwMTMxYTtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWxpbmUpO2JvcmRlci1yYWRpdXM6NnB4O3BhZGRpbmc6MnB4IDZweDtmb250LXNpemU6MTJweDt3b3JkLWJyZWFrOmJyZWFrLWFsbH0KLmJhZGdle2Rpc3BsYXk6aW5saW5lLWJsb2NrO3BhZGRpbmc6MnB4IDhweDtib3JkZXItcmFkaXVzOjIwcHg7Zm9udC1zaXplOjExcHg7YmFja2dyb3VuZDojMjMyODM4O2NvbG9yOnZhcigtLW11dGVkKTttYXJnaW4tbGVmdDo2cHh9Ci50b2FzdHtwb3NpdGlvbjpmaXhlZDtyaWdodDoxNnB4O3RvcDoxNnB4O3otaW5kZXg6OTk7YmFja2dyb3VuZDojMWMyMjMwO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSk7Ym9yZGVyLXJhZGl1czoxMHB4O3BhZGRpbmc6MTBweCAxNHB4O21heC13aWR0aDozMjBweDtkaXNwbGF5Om5vbmV9Ci50b2FzdC5zaG93e2Rpc3BsYXk6YmxvY2t9Ci5uYXZ7ZGlzcGxheTpmbGV4O2dhcDo2cHg7ZmxleC13cmFwOndyYXA7bWFyZ2luOjE0cHggMCAxOHB4fQoubmF2IGJ1dHRvbntiYWNrZ3JvdW5kOiMxYzIxMzA7Y29sb3I6dmFyKC0tbXV0ZWQpO2JvcmRlcjoxcHggc29saWQgdmFyKC0tbGluZSl9Ci5uYXYgYnV0dG9uLmFjdGl2ZXtiYWNrZ3JvdW5kOnZhcigtLWFjYyk7Y29sb3I6I2ZmZjtib3JkZXItY29sb3I6dmFyKC0tYWNjKX0KLnRhYntkaXNwbGF5Om5vbmV9LnRhYi5hY3RpdmV7ZGlzcGxheTpibG9ja30KPC9zdHlsZT4KPC9oZWFkPgo8Ym9keT4KPGRpdiBjbGFzcz0id3JhcCI+CjxoMT5DRk9uZSDnrqHnkIbpnaLmnb88L2gxPgo8ZGl2IGNsYXNzPSJtdXRlZCI+5Y2V5paH5Lu2IENsb3VkZmxhcmUg5Luj55CG6Z2i5p2/IMK3IOeJiOacrCA8c3BhbiBpZD0idmVyIj4tPC9zcGFuPjwvZGl2PgoKPGRpdiBpZD0ibG9naW4iIGNsYXNzPSJjYXJkIj4KPGgyPueZu+W9lTwvaDI+CjxsYWJlbD7pnaLmnb/lr4bnoIHvvIjpg6jnvbLlj5jph48gQe+8iTwvbGFiZWw+CjxpbnB1dCBpZD0icHciIHR5cGU9InBhc3N3b3JkIiBhdXRvY29tcGxldGU9ImN1cnJlbnQtcGFzc3dvcmQiIHBsYWNlaG9sZGVyPSLovpPlhaUgQSDnmoTlgLwiPgo8ZGl2IGNsYXNzPSJyb3ciPjxidXR0b24gaWQ9ImJ0bi1sb2dpbiI+55m75b2VPC9idXR0b24+PHNwYW4gY2xhc3M9Im11dGVkIiBpZD0ibG9naW4tbXNnIj48L3NwYW4+PC9kaXY+CjwvZGl2PgoKPGRpdiBpZD0ibWFpbiIgY2xhc3M9ImhpZGRlbiI+CjxkaXYgY2xhc3M9Im5hdiI+CjxidXR0b24gZGF0YS10YWI9Im92ZXJ2aWV3IiBjbGFzcz0iYWN0aXZlIj7mpoLop4g8L2J1dHRvbj4KPGJ1dHRvbiBkYXRhLXRhYj0ibm9kZXMiPuS8mOmAieiKgueCuTwvYnV0dG9uPgo8YnV0dG9uIGRhdGEtdGFiPSJzZXR0aW5ncyI+6K6+572uPC9idXR0b24+CjxidXR0b24gZGF0YS10YWI9ImFib3V0Ij7lhbPkuo48L2J1dHRvbj4KPC9kaXY+Cgo8ZGl2IGlkPSJ0YWItb3ZlcnZpZXciIGNsYXNzPSJ0YWIgYWN0aXZlIj4KPGRpdiBjbGFzcz0iY2FyZCI+CjxoMj7mpoLop4g8L2gyPgo8ZGl2IGNsYXNzPSJncmlkIj4KPGRpdj4KPGxhYmVsPuiKgueCuSBVVUlEPC9sYWJlbD48Y29kZSBpZD0ib3YtdXVpZCI+LTwvY29kZT4KPGxhYmVsPldTIOi3r+W+hDwvbGFiZWw+PGNvZGUgaWQ9Im92LXdzIj4tPC9jb2RlPgo8bGFiZWw+6IqC54K55pWw6YePPC9sYWJlbD48c3BhbiBpZD0ib3Ytbm9kZXMiIGNsYXNzPSJva2MiPi08L3NwYW4+CjxsYWJlbD5Ucm9qYW4vV1M8L2xhYmVsPjxzcGFuIGlkPSJvdi1ldCI+LTwvc3Bhbj4KPGxhYmVsPktWIOe7keWumjwvbGFiZWw+PHNwYW4gaWQ9Im92LWt2Ij4tPC9zcGFuPgo8L2Rpdj4KPGRpdj4KPGxhYmVsPuiuoumYheWcsOWdgO+8iOiHquWKqOivhuWIq+WuouaIt+err+agvOW8j++8iTwvbGFiZWw+Cjxjb2RlIGlkPSJvdi1zdWIiPi08L2NvZGU+CjxkaXYgY2xhc3M9InJvdyI+CjxidXR0b24gaWQ9ImJ0bi1jb3B5LXN1YiIgY2xhc3M9Imdob3N0Ij7lpI3liLborqLpmIXlnLDlnYA8L2J1dHRvbj4KPGJ1dHRvbiBpZD0iYnRuLWNvcHktY2xhc2giIGNsYXNzPSJnaG9zdCI+5aSN5Yi2IENsYXNoIOWcsOWdgDwvYnV0dG9uPgo8L2Rpdj4KPGRpdiBjbGFzcz0ibXV0ZWQiIHN0eWxlPSJtYXJnaW4tdG9wOjhweCI+5a6i5oi356uvIFVBIOiHquWKqOWMuemFje+8mkNsYXNoL01paG9tbyDihpIgWUFNTCDCtyBzaW5nLWJveCDihpIgSlNPTiDCtyB2MnJheU4vTmVrb0JveCDihpIgQmFzZTY0IMK3IOa1j+iniOWZqCDihpIg5piO5paHPC9kaXY+CjwvZGl2Pgo8L2Rpdj4KPC9kaXY+CjwvZGl2PgoKPGRpdiBpZD0idGFiLW5vZGVzIiBjbGFzcz0idGFiIj4KPGRpdiBjbGFzcz0iY2FyZCI+CjxoMj7kvJjpgInoioLngrnvvIjlrqLmiLfnq6/ov57mjqXnmoTlhaXlj6PlnLDlnYDvvIk8L2gyPgo8ZGl2IGNsYXNzPSJtdXRlZCI+55WZ56m65bm25L2/55So5YaF572u5rGg77yb5aGr5YaZ5ZCO6K6i6ZiF5LuF5L2/55So5q2k5YiX6KGo44CC5pSv5oyBIElQOnBvcnQj5aSH5rOoIOaIliDln5/lkI06cG9ydCPlpIfms6jvvIzpgJflj7cv5o2i6KGM5YiG6ZqU77yM5pyA5aSaIDEwMDAg5p2h44CCPC9kaXY+CjxsYWJlbD7miYvliqjliJfooag8L2xhYmVsPgo8dGV4dGFyZWEgaWQ9ImNmZy15eCIgcGxhY2Vob2xkZXI9IjEuMS4xLjE6NDQzI+iKgueCuUEmIzEwOzEwNC4xNy4yOS42OjQ0MyPoioLngrlCIj48L3RleHRhcmVhPgo8bGFiZWw+5Zyo57q/5YiX6KGoIFVSTO+8iOmAl+WPt+WIhumalOWkmuS4qu+8iTwvbGFiZWw+CjxpbnB1dCBpZD0iY2ZnLXl4dXJsIiBwbGFjZWhvbGRlcj0iaHR0cHM6Ly9leGFtcGxlLmNvbS9saXN0LnR4dCI+CjxkaXYgY2xhc3M9InJvdyI+CjxidXR0b24gaWQ9ImJ0bi1zYXZlLW5vZGVzIj7kv53lrZjkvJjpgInoioLngrk8L2J1dHRvbj4KPGJ1dHRvbiBpZD0iYnRuLXJlc2V0LW5vZGVzIiBjbGFzcz0iZ2hvc3QiPuaBouWkjeWGhee9ruaxoDwvYnV0dG9uPgo8c3BhbiBjbGFzcz0ibXV0ZWQiIGlkPSJub2Rlcy1tc2ciPjwvc3Bhbj4KPC9kaXY+CjwvZGl2Pgo8L2Rpdj4KCjxkaXYgaWQ9InRhYi1zZXR0aW5ncyIgY2xhc3M9InRhYiI+CjxkaXYgY2xhc3M9ImNhcmQiPgo8aDI+5Y2P6K6u5LiO5YWl5Y+jPC9oMj4KPGRpdiBjbGFzcz0iZ3JpZCI+CjxkaXY+CjxsYWJlbD7oioLngrkgVVVJRO+8iOeVmeepuiA9IOeUsSBBIOa0vueUn++8iTwvbGFiZWw+PGlucHV0IGlkPSJjZmctdXVpZCIgcGxhY2Vob2xkZXI9Inh4eHh4eHh4LXh4eHgteHh4eC14eHh4LXh4eHh4eHh4eHh4eCI+CjxsYWJlbD5XUyDpmqfpgZPot6/lvoQ8L2xhYmVsPjxpbnB1dCBpZD0iY2ZnLXdzcGF0aCIgcGxhY2Vob2xkZXI9Ii9jZm9uZS13cyI+CjxsYWJlbD48aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJjZmctZXQiIHN0eWxlPSJ3aWR0aDphdXRvIj4g5ZCv55SoIFRyb2phbi9XUzwvbGFiZWw+CjwvZGl2Pgo8ZGl2Pgo8bGFiZWw+VHJvamFuIOWvhuegge+8iOeVmeepuiA9IOiKgueCuSBVVUlE77yJPC9sYWJlbD48aW5wdXQgaWQ9ImNmZy10cCI+CjxsYWJlbD5XUyDot6/lvoQ8L2xhYmVsPjxkaXYgY2xhc3M9Im11dGVkIiBzdHlsZT0icGFkZGluZzo5cHggMCI+5LiO5a6i5oi356uv6K6i6ZiF5LiA6Ie077yM5pS55ZCO6ZyA6YeN5paw5a+85YWl6K6i6ZiFPC9kaXY+CjwvZGl2Pgo8L2Rpdj4KPC9kaXY+Cgo8ZGl2IGNsYXNzPSJjYXJkIj4KPGgyPuWHuuermeS4juS8mOmAiTwvaDI+CjxkaXYgY2xhc3M9ImdyaWQiPgo8ZGl2Pgo8bGFiZWw+UHJveHlJUO+8iGhvc3Qg5oiWIGhvc3Q6cG9ydO+8iTwvbGFiZWw+PGlucHV0IGlkPSJjZmctcCIgcGxhY2Vob2xkZXI9IuWPr+mAiSI+CjxsYWJlbD7lh7rnq5nku6PnkIbvvIhzb2NrczU6Ly8gfCBodHRwOi8vIHwgaHR0cHM6Ly/vvIzlj6/luKYgdXNlcjpwYXNzQO+8iTwvbGFiZWw+PGlucHV0IGlkPSJjZmctcyIgcGxhY2Vob2xkZXI9InNvY2tzNTovL3VzZXI6cGFzc0Bob3N0OjEwODAiPgo8L2Rpdj4KPGRpdj4KPGxhYmVsPuWHuuermeaWueW8jzwvbGFiZWw+CjxzZWxlY3QgaWQ9ImNmZy1xaiI+CjxvcHRpb24gdmFsdWU9IiI+56ue6YCf77yI55u06L+eICsgUHJveHlJUCDlubblj5Hlj5blhYjpgJrvvIk8L29wdGlvbj4KPG9wdGlvbiB2YWx1ZT0ibm8iPuebtOi/nuS8mOWFiO+8jOWksei0peWGjei1sOS7o+eQhjwvb3B0aW9uPgo8b3B0aW9uIHZhbHVlPSJvbmx5Ij7lj6rotbDku6PnkIbvvIjkuI3lm57okL3vvIk8L29wdGlvbj4KPC9zZWxlY3Q+CjxsYWJlbD48aW5wdXQgdHlwZT0iY2hlY2tib3giIGlkPSJjZmctYXBpIiBzdHlsZT0id2lkdGg6YXV0byI+IOWFgeiuuOS8mOmAiSBBUEkg566h55CGPC9sYWJlbD4KPC9kaXY+CjwvZGl2Pgo8L2Rpdj4KCjxkaXYgY2xhc3M9ImNhcmQiPgo8aDI+5Lyq6KOF6aG1PC9oMj4KPGRpdiBjbGFzcz0iZ3JpZCI+CjxkaXY+CjxsYWJlbD5NQVNLX0hUTUzvvIhvZmYvMCDlhbPpl63kvKroo4XvvIk8L2xhYmVsPjx0ZXh0YXJlYSBpZD0iY2ZnLW1hc2todG1sIiBwbGFjZWhvbGRlcj0i55WZ56m65L2/55So5YaF572u5qyi6L+O6aG1Ij48L3RleHRhcmVhPgo8L2Rpdj4KPGRpdj4KPGxhYmVsPk1BU0tfVVJM77yI5aSx6LSl5Zue6YCA5YaF572u6aG177yJPC9sYWJlbD48aW5wdXQgaWQ9ImNmZy1tYXNrdXJsIiBwbGFjZWhvbGRlcj0iaHR0cHM6Ly9leGFtcGxlLmNvbSI+CjwvZGl2Pgo8L2Rpdj4KPC9kaXY+Cgo8ZGl2IGNsYXNzPSJyb3ciPgo8YnV0dG9uIGlkPSJidG4tc2F2ZSIgY2xhc3M9Im9rIj7kv53lrZjlhajpg6g8L2J1dHRvbj4KPGJ1dHRvbiBpZD0iYnRuLWxvZ291dCIgY2xhc3M9Imdob3N0Ij7pgIDlh7rnmbvlvZU8L2J1dHRvbj4KPHNwYW4gY2xhc3M9Im11dGVkIiBpZD0ic2F2ZS1tc2ciPjwvc3Bhbj4KPC9kaXY+CjwvZGl2PgoKPGRpdiBpZD0idGFiLWFib3V0IiBjbGFzcz0idGFiIj4KPGRpdiBjbGFzcz0iY2FyZCI+CjxoMj7lhbPkuo48L2gyPgo8ZGl2IGNsYXNzPSJtdXRlZCI+CkNGT25lIOiejeWQiOiHqiBDRkFQRVggLyBDRlBpbG90IC8gY2ZuZXcg5LiJ5Liq5LiK5ri46aG555uu77ya5Y2V5paH5Lu25Y+M5b2i5oCB6YOo572yIMK3IEtWIOivu+WPluS8mOWMlu+8iOaXoOWFs+ivt+axguS4jeivuyBLVuOAgTEwIOenkueql+WPo+WQiOW5tu+8icK3IFBCS0RGMiDlj6Pku6QgKyBIdHRwT25seSDkvJror50gKyDorqLpmIXnrb7lkI3ku6TniYwgwrcg5Ye656uZ5YCZ6YCJ56ue6YCf5LiO5YGH5rS75qOA5rWLIMK3IFVBIOiHquWKqOivhuWIq+WkmuagvOW8j+iuoumYheOAgjxicj48YnI+CuWuieWFqOaPkOekuu+8mumdouadv+aMgeacieiAheWNs+i0puWPt+iuv+mXruiAheOAgumdouadv+WvhueggSBBIOivt+S9v+eUqOmVv+maj+acuuWAvO+8jOS4jeimgeWFrOW8gOiuoumYheWcsOWdgOS4jumdouadv+WcsOWdgOOAguazhOmcsuWQjuivt+abtOaNoiBBIOW5tumHjeaWsOmDqOe9suWPmOmHj+OAggo8L2Rpdj4KPC9kaXY+CjwvZGl2Pgo8L2Rpdj4KCjxkaXYgY2xhc3M9InRvYXN0IiBpZD0idG9hc3QiPjwvZGl2Pgo8L2Rpdj4KCjxzY3JpcHQ+CmNvbnN0IEFQSSA9IGxvY2F0aW9uLnBhdGhuYW1lLnJlcGxhY2UoL1wvKyQvLCAnJyk7CmNvbnN0ICQgPSAoaWQpID0+IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTsKbGV0IGF1dGhlZCA9ICR7J19fQVVUSEVEX18nfTsKbGV0IGNmZyA9ICR7J19fQ0ZHX18nfTsKCmZ1bmN0aW9uIHRvYXN0KG1zZywgb2spIHsKICBjb25zdCB0ID0gJCgndG9hc3QnKTsKICB0LnRleHRDb250ZW50ID0gbXNnOwogIHQuc3R5bGUuYm9yZGVyQ29sb3IgPSBvayA/ICd2YXIoLS1vayknIDogJ3ZhcigtLWVyciknOwogIHQuY2xhc3NMaXN0LmFkZCgnc2hvdycpOwogIHNldFRpbWVvdXQoKCkgPT4gdC5jbGFzc0xpc3QucmVtb3ZlKCdzaG93JyksIDI2MDApOwp9CmFzeW5jIGZ1bmN0aW9uIGFwaShwYXRoLCBtZXRob2QsIGJvZHkpIHsKICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaChwYXRoLCB7CiAgICBtZXRob2QsCiAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSwKICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IHVuZGVmaW5lZCwKICB9KTsKICBpZiAocmVzLnN0YXR1cyA9PT0gNDAxKSB7IGxvY2F0aW9uLnJlbG9hZCgpOyByZXR1cm4gbnVsbDsgfQogIGNvbnN0IGRhdGEgPSBhd2FpdCByZXMuanNvbigpLmNhdGNoKCgpID0+IG51bGwpOwogIHJldHVybiBkYXRhOwp9CmZ1bmN0aW9uIGZpbGxGb3JtKGMpIHsKICBpZiAoIWMpIHJldHVybjsKICAkKCdjZmctdXVpZCcpLnZhbHVlID0gYy51dWlkIHx8ICcnOwogICQoJ2NmZy13c3BhdGgnKS52YWx1ZSA9IGMud3NQYXRoIHx8ICcnOwogICQoJ2NmZy1ldCcpLmNoZWNrZWQgPSAhIWMuZXQ7CiAgJCgnY2ZnLXRwJykudmFsdWUgPSBjLnRyb2phblBhc3N3b3JkIHx8ICcnOwogICQoJ2NmZy1wJykudmFsdWUgPSBjLnByb3h5aXAgfHwgJyc7CiAgJCgnY2ZnLXMnKS52YWx1ZSA9IGMucyB8fCAnJzsKICAkKCdjZmctcWonKS52YWx1ZSA9IGMucWogfHwgJyc7CiAgJCgnY2ZnLXl4JykudmFsdWUgPSBjLnl4IHx8ICcnOwogICQoJ2NmZy15eHVybCcpLnZhbHVlID0gYy55eFVSTCB8fCAnJzsKICAkKCdjZmctbWFza2h0bWwnKS52YWx1ZSA9IGMubWFza0h0bWwgfHwgJyc7CiAgJCgnY2ZnLW1hc2t1cmwnKS52YWx1ZSA9IGMubWFza1VybCB8fCAnJzsKICAkKCdjZmctYXBpJykuY2hlY2tlZCA9ICEhYy5hcGk7Cn0KYXN5bmMgZnVuY3Rpb24gbG9hZE92ZXJ2aWV3KCkgewogIGNvbnN0IGQgPSBhd2FpdCBhcGkoQVBJICsgJy9hcGkvb3ZlcnZpZXcnLCAnR0VUJyk7CiAgaWYgKCFkKSByZXR1cm47CiAgJCgndmVyJykudGV4dENvbnRlbnQgPSBkLnZlcnNpb24gfHwgJy0nOwogICQoJ292LXV1aWQnKS50ZXh0Q29udGVudCA9IGQudXVpZCB8fCAnLSc7CiAgJCgnb3Ytd3MnKS50ZXh0Q29udGVudCA9IGQud3NQYXRoIHx8ICctJzsKICAkKCdvdi1ub2RlcycpLnRleHRDb250ZW50ID0gZC5ub2RlQ291bnQ7CiAgJCgnb3YtZXQnKS50ZXh0Q29udGVudCA9IGQuZXQgPyAn5bey5ZCv55SoJyA6ICflhbPpl60nOwogICQoJ292LWt2JykudGV4dENvbnRlbnQgPSBkLmt2Qm91bmQgPyAn5bey57uR5a6aJyA6ICfmnKrnu5HlrprvvIjphY3nva7ku4XlhoXlrZjnlJ/mlYjvvIknOwogICQoJ292LXN1YicpLnRleHRDb250ZW50ID0gZC5zdWJVcmwgfHwgJy0nOwp9CmFzeW5jIGZ1bmN0aW9uIGxvYWRDb25maWcoKSB7CiAgY29uc3QgZCA9IGF3YWl0IGFwaShBUEkgKyAnL2FwaS9jb25maWcnLCAnR0VUJyk7CiAgaWYgKGQgJiYgZC5jb25maWcpIGZpbGxGb3JtKGQuY29uZmlnKTsKfQpmdW5jdGlvbiB1aSgpIHsKICAkKCdsb2dpbicpLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicsIGF1dGhlZCk7CiAgJCgnbWFpbicpLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicsICFhdXRoZWQpOwogIGlmICghYXV0aGVkKSByZXR1cm47CiAgbG9hZE92ZXJ2aWV3KCk7CiAgbG9hZENvbmZpZygpOwp9CmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5uYXYgYnV0dG9uJykuZm9yRWFjaCgoYikgPT4gewogIGIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7CiAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcubmF2IGJ1dHRvbicpLmZvckVhY2goKHgpID0+IHguY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJykpOwogICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnRhYicpLmZvckVhY2goKHgpID0+IHguY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJykpOwogICAgYi5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTsKICAgICQoJ3RhYi0nICsgYi5kYXRhc2V0LnRhYikuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7CiAgfSk7Cn0pOwokKCdidG4tbG9naW4nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHsKICBjb25zdCBwdyA9ICQoJ3B3JykudmFsdWU7CiAgY29uc3QgZCA9IGF3YWl0IGFwaShBUEkgKyAnL2FwaS9sb2dpbicsICdQT1NUJywgeyBwYXNzd29yZDogcHcgfSk7CiAgaWYgKGQgJiYgZC5vaykgeyB0b2FzdCgn55m75b2V5oiQ5YqfJywgdHJ1ZSk7IGF1dGhlZCA9IHRydWU7IHVpKCk7IH0KICBlbHNlICQoJ2xvZ2luLW1zZycpLnRleHRDb250ZW50ID0gJ+WvhueggemUmeivr+aIluivt+axguWPl+mZkCc7Cn0pOwokKCdidG4tbG9nb3V0JykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7CiAgYXdhaXQgYXBpKEFQSSArICcvYXBpL2xvZ291dCcsICdQT1NUJywge30pOwogIGxvY2F0aW9uLnJlbG9hZCgpOwp9KTsKJCgnYnRuLXNhdmUnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGFzeW5jICgpID0+IHsKICBjb25zdCBjZmcgPSB7CiAgICB1dWlkOiAkKCdjZmctdXVpZCcpLnZhbHVlLnRyaW0oKSwKICAgIHdzUGF0aDogJCgnY2ZnLXdzcGF0aCcpLnZhbHVlLnRyaW0oKSwKICAgIGV0OiAkKCdjZmctZXQnKS5jaGVja2VkLAogICAgdHJvamFuUGFzc3dvcmQ6ICQoJ2NmZy10cCcpLnZhbHVlLAogICAgcHJveHlpcDogJCgnY2ZnLXAnKS52YWx1ZS50cmltKCksCiAgICBzOiAkKCdjZmctcycpLnZhbHVlLnRyaW0oKSwKICAgIHFqOiAkKCdjZmctcWonKS52YWx1ZSwKICAgIHl4OiAkKCdjZmcteXgnKS52YWx1ZSwKICAgIHl4VVJMOiAkKCdjZmcteXh1cmwnKS52YWx1ZS50cmltKCksCiAgICBtYXNrSHRtbDogJCgnY2ZnLW1hc2todG1sJykudmFsdWUsCiAgICBtYXNrVXJsOiAkKCdjZmctbWFza3VybCcpLnZhbHVlLnRyaW0oKSwKICAgIGFwaTogJCgnY2ZnLWFwaScpLmNoZWNrZWQsCiAgfTsKICBjb25zdCBkID0gYXdhaXQgYXBpKEFQSSArICcvYXBpL2NvbmZpZycsICdQVVQnLCB7IGNvbmZpZzogY2ZnIH0pOwogIGlmIChkICYmIGQub2spIHsgdG9hc3QoJ+W3suS/neWtmCcsIHRydWUpOyBsb2FkT3ZlcnZpZXcoKTsgfQogIGVsc2UgeyB0b2FzdChkICYmIGQuZXJyb3IgPT09ICduby1rdicgPyAn5pyq57uR5a6aIEtW77yM5peg5rOV5L+d5a2YJyA6ICfkv53lrZjlpLHotKUnLCBmYWxzZSk7IH0KfSk7CiQoJ2J0bi1zYXZlLW5vZGVzJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBhc3luYyAoKSA9PiB7CiAgY29uc3QgbGlzdCA9ICQoJ2NmZy15eCcpLnZhbHVlOwogIGNvbnN0IGQgPSBhd2FpdCBhcGkoQVBJICsgJy9hcGkvcHJlZmVycmVkLWlwcycsICdQVVQnLCB7IGxpc3QgfSk7CiAgaWYgKGQgJiYgZC5vaykgeyB0b2FzdCgn5bey5L+d5a2YICcgKyBkLmNvdW50ICsgJyDmnaEnLCB0cnVlKTsgfQogIGVsc2UgdG9hc3QoJ+S/neWtmOWksei0pe+8iOmcgOe7keWumiBLVu+8iScsIGZhbHNlKTsKfSk7CiQoJ2J0bi1yZXNldC1ub2RlcycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgYXN5bmMgKCkgPT4gewogIGNvbnN0IGQgPSBhd2FpdCBhcGkoQVBJICsgJy9hcGkvcHJlZmVycmVkLWlwcycsICdERUxFVEUnLCB7fSk7CiAgaWYgKGQgJiYgZC5vaykgeyAkKCdjZmcteXgnKS52YWx1ZSA9ICcnOyB0b2FzdCgn5bey5oGi5aSN5YaF572u5rGgJywgdHJ1ZSk7IH0KICBlbHNlIHRvYXN0KCfmgaLlpI3lpLHotKXvvIjpnIDnu5HlrpogS1bvvIknLCBmYWxzZSk7Cn0pOwokKCdidG4tY29weS1zdWInKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHsgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoJCgnb3Ytc3ViJykudGV4dENvbnRlbnQpOyB0b2FzdCgn5bey5aSN5Yi2JywgdHJ1ZSk7IH0pOwokKCdidG4tY29weS1jbGFzaCcpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4geyBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlVGV4dCgkKCdvdi1zdWInKS50ZXh0Q29udGVudCArICc/Zm9ybWF0PWNsYXNoJyk7IHRvYXN0KCflt7LlpI3liLYnLCB0cnVlKTsgfSk7CiQoJ3B3JykuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIChlKSA9PiB7IGlmIChlLmtleSA9PT0gJ0VudGVyJykgJCgnYnRuLWxvZ2luJykuY2xpY2soKTsgfSk7CnVpKCk7Cjwvc2NyaXB0Pgo8L2JvZHk+CjwvaHRtbD4K"];
const __D=(()=>{const d=new TextDecoder(),m=new Map();return i=>{let v=m.get(i);if(v===undefined){const s=atob(__T[i]),u=new Uint8Array(s.length);for(let j=0;j<s.length;j++)u[j]=s.charCodeAt(j);v=d.decode(u);m.set(i,v);}return v;};})();
const VERSION = '1.0.0';

const HEX = '0123456789abcdef';

const OUTBOUND_DEFAULT_PORTS = [80, 443, 2052, 2053, 2082, 2083, 2086, 2087, 2095, 2096, 8080, 8443, 8880];

const MAX_CLOSE_REASON = 123;

const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

const LOGIN_WINDOW_MS = 60000;
const LOGIN_MAX_PER_IP = 10;

const MAX_UNAUTH_FIRST_PACKET = 64 * 1024;

const MAX_CONN_MS = 15 * 60 * 1000; 
const MAX_UPLOAD = 64 * 1024 * 1024; 
const MAX_DOWNLOAD = 128 * 1024 * 1024; 

const STALL_TIMEOUT_MS = 3500;

const BUILTIN_IPS = [
  __D(1), __D(2), __D(3),
  __D(4), __D(5), __D(6),
  __D(7), __D(8), __D(9),
  __D(10), __D(11), __D(12),
  __D(13), __D(14),
];

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

function isUUID(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function randomUUID() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  let s = '';
  for (const x of b) s += HEX[x >> 4] + HEX[x & 15];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

async function sha224Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-224', data);
  const bytes = new Uint8Array(digest);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}
async function hmacHex(keyStr, msgStr) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(keyStr),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msgStr));
  const bytes = new Uint8Array(sig);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}

async function pbkdf2Hex(password, salt, iterations = 100000) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
    key, 256
  );
  const bytes = new Uint8Array(bits);
  let s = '';
  for (const b of bytes) s += HEX[b >> 4] + HEX[b & 15];
  return s;
}

function utf8Encode(s) { return new TextEncoder().encode(s); }
function utf8Decode(u) { return new TextDecoder().decode(u); }
function closeReason(s) {
  return s.length > MAX_CLOSE_REASON ? s.slice(0, MAX_CLOSE_REASON) : s;
}
function nowMs() { return Date.now(); }

const KV_CFG = 'cfg';     
const KV_IPS = 'ips';     
const KV_VER = 'ver';     

function defaultConfig() {
  return {
    uuid: '',
    trojanPassword: '',
    et: false,
    wsPath: '',
    proxyip: '',
    s: '',
    qj: '',
    yx: '',
    yxURL: '',
    maskHtml: '',
    maskUrl: '',
    outboundPorts: [],
    api: false,
    version: '',
  };
}

function envConfig(env) {
  const g = (name, fallback = '') => {
    const v = env[name] ?? env[name.toUpperCase()] ?? env[name.toLowerCase()] ?? fallback;
    return v === undefined ? fallback : String(v);
  };
  return {
    uuid: g('u'),
    trojanPassword: g('tp'),
    et: g('et').toLowerCase() === 'yes' || g('et') === '1' || g('et') === 'on' || g('et') === 'true',
    wsPath: g('d') || g('ws_path'),
    proxyip: g('p') || g('proxyip'),
    s: g('s'),
    qj: g('qj'),
    yx: g('yx'),
    yxURL: g('yxurl') || g('yx_url'),
    maskHtml: g('mask_html'),
    maskUrl: g('mask_url'),
    outboundPorts: parsePortList(g('outbound_ports')),
    api: g('ae').toLowerCase() === 'yes' || g('ae') === '1',
    version: '',
  };
}

function parsePortList(s) {
  if (!s) return null;
  const out = [];
  for (const part of String(s).split(',')) {
    const n = parseInt(part.trim(), 10);
    if (Number.isInteger(n) && n >= 1 && n <= 65535) out.push(n);
  }
  return out.length ? out : null;
}

const _kvCache = new Map(); 
const _verCache = { ver: null, cfg: null, at: 0 };

async function kvRead(kv, key, ttlMs = 10000) {
  const hit = _kvCache.get(key);
  if (hit && nowMs() - hit.time < ttlMs) {
    try { return await hit.promise; } catch {  }
  }
  const promise = kv.get(key).then((v) => v).catch(() => null);
  _kvCache.set(key, { time: nowMs(), promise });
  try { return await promise; } catch { return null; }
}

async function kvWrite(kv, key, value) {
  
  _kvCache.delete(key);
  
  if (key === KV_CFG || key === KV_VER) {
    _verCache.ver = null;
    _verCache.cfg = null;
    _verCache.at = 0;
  }
  await kv.put(key, value);
}

async function readPanelConfig(kv) {
  if (!kv) return null;
  try {
    const ver = await kvRead(kv, KV_VER, 10000);
    if (_verCache.ver === ver && _verCache.at > 0) return _verCache.cfg;
    const raw = await kvRead(kv, KV_CFG, 5000);
    const cfg = raw ? JSON.parse(raw) : null;
    _verCache.ver = ver;
    _verCache.cfg = cfg;
    _verCache.at = nowMs();
    return cfg;
  } catch { return null; }
}

function mergedConfig(envCfg, kvCfg) {
  const def = defaultConfig();
  const out = { ...def, ...envCfg };
  if (kvCfg && typeof kvCfg === 'object') {
    for (const key of Object.keys(def)) {
      const v = kvCfg[key];
      if (v !== undefined && v !== null && v !== '') {
        if (key === 'et') out.et = v === true || v === 'yes' || v === '1';
        else if (key === 'api') out.api = v === true || v === 'yes' || v === '1';
        else if (key === 'outboundPorts' && Array.isArray(v)) out.outboundPorts = v;
        else out[key] = String(v);
      }
    }
    
    for (const key of ['maskHtml', 'maskUrl', 'proxyip', 's']) {
      const v = kvCfg[key];
      if (v === 'off' || v === '0' || v === 'false') out[key] = '';
    }
  }
  if (!out.wsPath) out.wsPath = '/cfone-ws';
  if (!out.wsPath.startsWith('/')) out.wsPath = '/' + out.wsPath;
  if (!out.uuid) out.uuid = deriveUUID(envCfg.panelPassword);
  return out;
}

function deriveUUID(password) {
  
  const seeds = [0x811c9dc5, 0x01000193, 0x85ebca6b, 0xc2b2ae35];
  const hs = seeds.map((seed) => {
    let h = seed;
    const s = String(password || '');
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i) + i * 31;
      h = (((h ^ c) >>> 0) * seed) >>> 0;
    }
    return h >>> 0;
  });
  const hex = (n) => { let x = n >>> 0, h = ''; for (let i = 0; i < 8; i++) { h = HEX[x & 15] + h; x >>>= 4; } return h; };
  const full = hs.map(hex).join(''); 
  return `${full.slice(0, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}-${full.slice(16, 20)}-${full.slice(20)}`;
}

const _sessions = new Set(); 
const _loginAttempts = new Map(); 

async function checkPassword(envCfg, password) {
  const a = envCfg.panelPassword;
  if (!a) return false;
  
  if (typeof password !== 'string' || password.length !== a.length) return false;
  const salt = randomUUID();
  const [h1, h2] = await Promise.all([pbkdf2Hex(password, salt), pbkdf2Hex(a, salt)]);
  return safeEqual(h1, h2);
}

function loginThrottled(ip) {
  const now = nowMs();
  const arr = (_loginAttempts.get(ip) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (arr.length >= LOGIN_MAX_PER_IP) { _loginAttempts.set(ip, arr); return true; }
  arr.push(now);
  _loginAttempts.set(ip, arr);
  return false;
}

async function issueSession(panelPassword) {
  const nonce = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
  const sig = await hmacHex(panelPassword, 'sess:' + nonce);
  _sessions.add(nonce);
  return { cookie: nonce + '.' + sig, nonce };
}

async function verifySession(panelPassword, cookieValue) {
  if (!cookieValue || !panelPassword) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return false;
  const [nonce, sig] = parts;
  if (!_sessions.has(nonce)) return false;
  const expect = await hmacHex(panelPassword, 'sess:' + nonce);
  return safeEqual(expect, sig);
}

function revokeSession(cookieValue) {
  const parts = (cookieValue || '').split('.');
  if (parts.length === 2) _sessions.delete(parts[0]);
}

async function subToken(panelPassword) {
  const h = await hmacHex(panelPassword, 'sub');
  return h.slice(0, 32);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await route(request, env, ctx);
    } catch (err) {
      
      return maskResponse(request, env, ctx, 200, err);
    }
  },
};

async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const envCfg = {
    ...envConfig(env),
    panelPassword: String(env.A ?? ''),
  };
  const pw = envCfg.panelPassword;
  const isWs = request.headers.get('upgrade')?.toLowerCase() === 'websocket';

  
  
  if (pw && (path === '/' + pw || path.startsWith('/' + pw + '/'))) {
    const cfg = await loadCfg(env);
    if (path === '/' + pw || path === '/' + pw + '/') {
      return handlePanelLoginPage(request, env, ctx, cfg);
    }
    let rest = path.slice(pw.length + 2);
    if (rest.startsWith('api/')) rest = rest.slice(4);
    return handlePanelApi(request, env, ctx, cfg, rest);
  }

  
  if (method === 'GET' && path.startsWith('/s/')) {
    const expect = await subToken(pw);
    const tok = path.slice(3);
    if (expect && tok && safeEqual(tok, expect)) {
      const cfg = await loadCfg(env);
      return handleSubscription(request, env, ctx, cfg);
    }
    return maskResponse(request, env, ctx, 404);
  }

  
  if (isWs) {
    if (pw) {
      const cfg = await loadCfg(env);
      if (path === cfg.wsPath) {
        return handleTunnel(request, envCfg, cfg);
      }
    }
    return maskResponse(request, env, ctx, 404);
  }

  
  return maskResponse(request, env, ctx, method === 'GET' ? 200 : 405);
}

async function loadCfg(env) {
  const envCfg = {
    ...envConfig(env),
    panelPassword: String(env.A ?? ''),
  };
  const kv = env.K || null;
  const kvCfg = await readPanelConfig(kv);
  return mergedConfig(envCfg, kvCfg);
}

async function handleTunnel(request, envCfg, cfg) {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  const uuid = cfg.uuid;
  const trojanPassword = cfg.trojanPassword || uuid;
  const trojanEnabled = cfg.et;
  
  if (trojanEnabled) trojanHashCache = await sha224Hex(trojanPassword);

  
  const wsUrl = new URL(request.url);
  const pathCfg = { ...cfg };
  if (wsUrl.searchParams.get('pyip')) pathCfg.proxyip = wsUrl.searchParams.get('pyip');
  if (wsUrl.searchParams.get('s')) pathCfg.s = wsUrl.searchParams.get('s');
  if (wsUrl.searchParams.get('qj')) pathCfg.qj = wsUrl.searchParams.get('qj');
  

  let closed = false;
  let firstPacket = true;
  let unauthBytes = 0;
  let protocol = null; 
  let upBytes = 0;
  let downBytes = 0;
  const startedAt = nowMs();
  let upstream = null; 
  let upstreamStallTimer = null;
  let redials = 0;

  const clientClose = (code, reason) => {
    if (closed) return;
    closed = true;
    clearStall();
    try { server.close(code, closeReason(reason)); } catch {  }
    closeUpstream();
  };

  const closeUpstream = () => {
    if (upstream) {
      try { upstream.socket.close(); } catch {  }
      upstream = null;
    }
  };

  const clearStall = () => {
    if (upstreamStallTimer) { clearTimeout(upstreamStallTimer); upstreamStallTimer = null; }
  };

  
  server.addEventListener('message', (ev) => {
    if (closed) return;
    const raw = ev.data;
    let bytes;
    if (raw instanceof ArrayBuffer) bytes = new Uint8Array(raw);
    else if (raw instanceof Uint8Array) bytes = raw;
    else if (typeof raw === 'string') bytes = utf8Encode(raw);
    else return;

    if (firstPacket) {
      firstPacket = false;
      try {
        const parsed = parseProxyHeader(bytes, uuid, trojanPassword, trojanEnabled);
        if (!parsed) { clientClose(1011, 'bad-header'); return; }
        protocol = parsed.protocol;
        const payload = parsed.payload;
        upBytes += bytes.length;
        const out = dialAndPipe(payload, parsed.target, pathCfg, onUpstreamData, onUpstreamError);
        return; 
      } catch (err) {
        clientClose(1011, 'proxy-fail');
        return;
      }
    }

    upBytes += bytes.length;
    if (upBytes > MAX_UPLOAD) { clientClose(1009, 'up-limit'); return; }
    if (upstream && upstream.writer) {
      upstream.writer.write(bytes).catch(() => clientClose(1011, 'up-write-fail'));
    }
  });

  server.addEventListener('close', () => {
    if (!closed) { closed = true; closeUpstream(); }
  });
  server.addEventListener('error', () => {
    if (!closed) { closed = true; closeUpstream(); }
  });

  
  function onUpstreamData(chunk) {
    if (closed) return;
    clearStall(); 
    downBytes += chunk.length;
    if (downBytes > MAX_DOWNLOAD) { clientClose(1009, 'down-limit'); return; }
    try { server.send(chunk); } catch { clientClose(1011, 'down-send-fail'); }
  }
  function onUpstreamError(code, reason) {
    if (closed) return;
    clientClose(code, reason);
  }

  
  async function dialAndPipe(earlyPayload, target, cfg2, onData, onErr) {
    clearStall();
    const deadline = startedAt + MAX_CONN_MS;
    try {
      const sock = await dialOutbound(target, cfg2, { deadline });
      upstream = sock;
      
      pumpUpstream(sock, onData, onErr);
      
      if (earlyPayload && earlyPayload.length > 0) {
        sock.writer.write(earlyPayload).catch(() => onErr(1011, 'up-write-fail'));
      }
      
      armStall(sock);
    } catch (err) {
      onErr(1011, 'dial-fail');
    }
  }

  function armStall(sock) {
    clearStall();
    upstreamStallTimer = setTimeout(() => {
      
      if (closed || !upstream || redials >= 1) return;
      redials++;
      const target = lastTarget;
      if (!target) return;
      closeUpstream();
      dialAndPipe(null, target, pathCfg, onUpstreamData, onUpstreamError);
    }, STALL_TIMEOUT_MS);
  }

  let lastTarget = null;
  
  const _origDial = dialAndPipe;
  dialAndPipe = (early, target, cfg2, onData, onErr) => {
    lastTarget = target;
    return _origDial(early, target, cfg2, onData, onErr);
  };

  return new Response(null, { status: 101, webSocket: client });
}

function pumpUpstream(conn, onData, onErr) {
  if (conn.first && conn.first.length > 0) onData(conn.first);
  const reader = conn.reader || conn.socket.readable.getReader();
  (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) { onErr(1011, 'up-eof'); return; }
        onData(value);
      }
    } catch {
      onErr(1011, 'up-read-fail');
    }
  })();
}

function parseProxyHeader(bytes, uuid, trojanPassword, trojanEnabled) {
  
  const TROJAN_HEAD = 0x0d0a0d0a;
  if (bytes.length >= 56 + 8 && bytes[0] === 13 && bytes[1] === 10 && bytes[2] === 13 && bytes[3] === 10) {
    if (!trojanEnabled) return null;
    const hashHex = utf8Decode(bytes.subarray(4, 4 + 56));
    if (!/^[0-9a-f]{56}$/.test(hashHex)) return null;
    if (bytes[60] !== 13 || bytes[61] !== 10 || bytes[62] !== 13 || bytes[63] !== 10) return null;
    
    
    
    if (!safeEqual(hashHex, trojanHashCache)) return null;
    const { atyp, addr, port, off } = parseAddress(bytes, 64);
    if (!atyp) return null;
    return { protocol: 'trojan', target: { host: addr, port }, payload: bytes.subarray(off) };
  }

  
  if (bytes.length < 1 + 16 + 1 + 1 + 1 + 2) return null;
  if (bytes[0] !== 0) return null;
  const clientUuid = [
    hexStr(bytes, 1, 4), hexStr(bytes, 5, 2), hexStr(bytes, 7, 2),
    hexStr(bytes, 9, 2), hexStr(bytes, 11, 6),
  ].join('-');
  if (!safeEqual(clientUuid.toLowerCase(), uuid.toLowerCase())) return null;
  const addonLen = bytes[17];
  const addonStart = 18;
  if (addonStart + addonLen + 1 + 1 + 2 > bytes.length) return null;
  const cmd = bytes[addonStart + addonLen];
  if (cmd !== 0x01 && cmd !== 0x02) return null; 
  const { atyp, addr, port, off } = parseAddress(bytes, addonStart + addonLen + 1);
  if (!atyp) return null;
  const payloadStart = off;
  const early = bytes.subarray(addonStart, addonStart + addonLen); 
  const payload = bytes.subarray(payloadStart);
  const merged = new Uint8Array(early.length + payload.length);
  merged.set(early, 0);
  merged.set(payload, early.length);
  return { protocol: 'vless', target: { host: addr, port }, payload: merged };
}

function hexStr(u, start, len) {
  let s = '';
  for (let i = 0; i < len; i++) s += HEX[u[start + i] >> 4] + HEX[u[start + i] & 15];
  return s;
}

function parseAddress(bytes, start) {
  if (start >= bytes.length) return { off: start };
  const atyp = bytes[start];
  let off = start + 1;
  let addr = '';
  if (atyp === 1) { 
    if (off + 4 > bytes.length) return { off: start };
    addr = `${bytes[off]}.${bytes[off + 1]}.${bytes[off + 2]}.${bytes[off + 3]}`;
    off += 4;
  } else if (atyp === 2) { 
    if (off + 1 > bytes.length) return { off: start };
    const len = bytes[off];
    off += 1;
    if (off + len > bytes.length) return { off: start };
    addr = utf8Decode(bytes.subarray(off, off + len));
    off += len;
  } else if (atyp === 3) { 
    if (off + 16 > bytes.length) return { off: start };
    const parts = [];
    for (let i = 0; i < 16; i += 2) {
      parts.push(HEX[bytes[off + i] >> 4] + HEX[bytes[off + i] & 15] + HEX[bytes[off + i + 1] >> 4] + HEX[bytes[off + i + 1] & 15]);
    }
    addr = parts.join(':');
    off += 16;
  } else {
    return { off: start };
  }
  if (off + 2 > bytes.length) return { off: start };
  const port = (bytes[off] << 8) | bytes[off + 1];
  off += 2;
  return { atyp, addr, port, off };
}

function isValidTargetHost(host) {
  if (!host || host.length > 253) return false;
  if (/^[0-9.]+$/.test(host)) {
    const parts = host.split('.');
    if (parts.length !== 4) return false;
    let invalid = false;
    parts.forEach((p) => { const n = parseInt(p, 10); if (!Number.isInteger(n) || n < 0 || n > 255) invalid = true; });
    if (invalid) return false;
    const first = parseInt(parts[0], 10);
    
    if (first === 10 || first === 127 || first === 0) return false;
    if (first === 192 && parseInt(parts[1], 10) === 168) return false;
    if (first === 172 && parseInt(parts[1], 10) >= 16 && parseInt(parts[1], 10) <= 31) return false;
    if (first === 169 && parseInt(parts[1], 10) === 254) return false;
    if (first === 100 && parseInt(parts[1], 10) >= 64 && parseInt(parts[1], 10) <= 127) return false;
    return true;
  }
  if (host.includes(':')) {
    
    const lower = host.toLowerCase();
    if (lower === '::1' || lower.startsWith('fe80') || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('::')) return false;
    return /^[0-9a-f:.]+$/.test(lower);
  }
  
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(host);
}

function isValidTargetPort(port, allowedPorts) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
  if (allowedPorts && allowedPorts.length > 0) return allowedPorts.includes(port);
  return OUTBOUND_DEFAULT_PORTS.includes(port);
}

function buildCandidates(target, cfg) {
  const { host, port } = target;
  const list = [];
  const proxyip = cfg.proxyip || '';
  const proxy = cfg.s || '';

  if (cfg.qj === 'only') {
    if (proxy) list.push({ kind: 'proxy', spec: proxy });
    else list.push({ kind: 'direct', host, port });
    return list;
  }

  const direct = { kind: 'direct', host, port };
  const viaProxyIp = proxyip
    ? { kind: 'direct-via', host, port, viaHost: proxyHost(proxyip), viaPort: proxyPort(proxyip, port) }
    : null;

  if (cfg.qj === 'no') {
    list.push(direct);
    if (viaProxyIp) list.push(viaProxyIp);
    if (proxy) list.push({ kind: 'proxy', spec: proxy });
  } else {
    
    if (viaProxyIp) list.push(viaProxyIp);
    list.push(direct);
    if (proxy) list.push({ kind: 'proxy', spec: proxy });
  }
  return list;
}

function proxyHost(spec) {
  const m = spec.match(/^(?:[a-z]+:\/\/)?(?:[^@]+@)?\[?([^\]:/]+)\]?(?::(\d+))?$/);
  return m ? m[1] : spec;
}
function proxyPort(spec, fallback) {
  const m = spec.match(/^(?:[a-z]+:\/\/)?(?:[^@]+@)?\[?[^\]:/]+\]?:(\d+)$/);
  return m ? parseInt(m[1], 10) : (fallback || 443);
}

async function dialOutbound(target, cfg, opts) {
  const allowedPorts = cfg.outboundPorts && cfg.outboundPorts.length ? cfg.outboundPorts : OUTBOUND_DEFAULT_PORTS;
  if (!isValidTargetHost(target.host) || !isValidTargetPort(target.port, allowedPorts)) {
    throw new Error('blocked-target');
  }
  const candidates = buildCandidates(target, cfg);
  const deadline = opts.deadline || (nowMs() + 20000);

  
  
  const race = candidates.filter((c) => c.kind !== 'proxy');
  if (race.length > 0) {
    const conn = await raceConnect(race, deadline);
    if (conn) return conn;
  }

  
  const proxies = candidates.filter((c) => c.kind === 'proxy');
  for (const p of proxies) {
    if (nowMs() >= deadline) break;
    try {
      const conn = await connectViaProxy(p.spec, target, deadline - nowMs());
      if (conn) return conn;
    } catch {  }
  }
  throw new Error('no-candidate');
}

async function raceConnect(candidates, deadline) {
  const results = await Promise.allSettled(candidates.map(async (c) => {
    const info = c.kind === 'direct'
      ? { hostname: c.host, port: c.port }
      : { hostname: c.viaHost, port: c.viaPort };
    const socket = connect(info);
    const reader = socket.readable.getReader();
    const timeout = Math.max(500, Math.min(8000, deadline - nowMs()));
    const first = await Promise.race([
      reader.read().then((r) => r),
      new Promise((res) => setTimeout(() => res({ done: true, timeout: true }), timeout)),
    ]);
    if (first.done || first.timeout) {
      
      try { reader.releaseLock(); } catch {  }
      try { socket.close(); } catch {  }
      throw new Error('no-first-byte');
    }
    return { socket, writer: socket.writable.getWriter(), reader, first: first.value };
  }));
  const ok = results.filter((r) => r.status === 'fulfilled' && r.value);
  if (ok.length === 0) return null;
  const chosen = ok[0].value;
  for (let i = 1; i < ok.length; i++) {
    try { ok[i].value.socket.close(); } catch {  }
  }
  return chosen;
}

async function connectViaProxy(spec, target, timeoutMs) {
  const m = spec.match(/^(([a-z]+):\/\/)?(([^@]+)@)?\[?([^\]:/]+)\]?(?::(\d+))?$/i);
  if (!m) throw new Error('bad-proxy-spec');
  const scheme = (m[2] || 'socks5').toLowerCase();
  const creds = m[4] || '';
  const host = m[5];
  const port = m[6] ? parseInt(m[6], 10) : (scheme === 'http' ? 80 : scheme === 'https' ? 443 : 1080);
  if (!host) throw new Error('bad-proxy-spec');

  const raw = connect({ hostname: host, port });
  const writer = raw.writable.getWriter();
  const reader = raw.readable.getReader();
  const encoder = new TextEncoder();

  if (scheme === 'socks5') {
    
    let auth = false;
    let user = '', pass = '';
    if (creds) {
      const ci = creds.indexOf(':');
      if (ci >= 0) { user = creds.slice(0, ci); pass = creds.slice(ci + 1); auth = true; }
    }
    const methods = auth ? [0x02, 0x00] : [0x00];
    await writer.write(new Uint8Array([0x05, methods.length, ...methods]));
    const reply = await readExact(reader, 2, timeoutMs);
    if (reply[0] !== 0x05 || reply[1] === 0xff) throw new Error('socks5-method-rejected');
    if (reply[1] === 0x02) {
      const u = encoder.encode(user);
      const p = encoder.encode(pass);
      const authReq = new Uint8Array(1 + 1 + u.length + 1 + p.length);
      authReq[0] = 0x01; authReq[1] = u.length;
      authReq.set(u, 2);
      authReq[2 + u.length] = p.length;
      authReq.set(p, 3 + u.length);
      await writer.write(authReq);
      const authReply = await readExact(reader, 2, timeoutMs);
      if (authReply[0] !== 0x01 || authReply[1] !== 0x00) throw new Error('socks5-auth-failed');
    }
    
    const req = buildSocks5Connect(target);
    await writer.write(req);
    const head = await readExact(reader, 4, timeoutMs);
    if (head[0] !== 0x05 || head[1] !== 0x00) throw new Error('socks5-connect-rejected');
    
    let toSkip;
    if (head[3] === 1) toSkip = 4 + 2;
    else if (head[3] === 3) { const l = (await readExact(reader, 1, timeoutMs))[0]; toSkip = 1 + l + 2; }
    else if (head[3] === 4) toSkip = 16 + 2;
    else throw new Error('socks5-bad-bnd');
    if (toSkip > 0) await readExact(reader, toSkip, timeoutMs);
    return { socket: raw, writer, reader, first: null };
  }

  
  const connectUrl = `${target.host}:${target.port}`;
  const authHeader = creds ? 'Proxy-Authorization: Basic ' + btoa(creds) + '\r\n' : '';
  const headStr = `CONNECT ${connectUrl} HTTP/1.1\r\nHost: ${connectUrl}\r\n${authHeader}\r\n`;
  await writer.write(encoder.encode(headStr));
  const buf = [];
  let total = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) throw new Error('proxy-eof');
    buf.push(chunk.value);
    total += chunk.value.length;
    const all = concatBytes(buf);
    const idx = findHeaderEnd(all);
    if (idx >= 0) {
      const status = utf8Decode(all.subarray(0, idx)).split('\r\n')[0] || '';
      if (!/^HTTP\/1\.[01]\s+200/.test(status)) throw new Error('proxy-connect-rejected:' + status);
      const extra = all.subarray(idx + 4);
      return { socket: raw, writer, reader, first: extra.length > 0 ? extra : null };
    }
    if (total > 65536) throw new Error('proxy-header-too-big');
  }
}

function buildSocks5Connect(target) {
  const enc = new TextEncoder();
  const host = target.host;
  if (/^[0-9.]+$/.test(host)) {
    const parts = host.split('.').map(Number);
    const req = new Uint8Array(4 + 4 + 2);
    req[0] = 0x05; req[1] = 0x01; req[2] = 0x00; req[3] = 0x01;
    req[4] = parts[0]; req[5] = parts[1]; req[6] = parts[2]; req[7] = parts[3];
    req[8] = target.port >> 8; req[9] = target.port & 0xff;
    return req;
  }
  const name = enc.encode(host);
  const req = new Uint8Array(4 + 1 + name.length + 2);
  req[0] = 0x05; req[1] = 0x01; req[2] = 0x00; req[3] = 0x03;
  req[4] = name.length;
  req.set(name, 5);
  req[5 + name.length] = target.port >> 8;
  req[6 + name.length] = target.port & 0xff;
  return req;
}

function concatBytes(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}
function findHeaderEnd(bytes) {
  for (let i = 0; i + 3 < bytes.length; i++) {
    if (bytes[i] === 13 && bytes[i + 1] === 10 && bytes[i + 2] === 13 && bytes[i + 3] === 10) return i;
  }
  return -1;
}
async function readExact(reader, n, timeoutMs) {
  const chunks = [];
  let got = 0;
  const deadline = nowMs() + (timeoutMs || 8000);
  while (got < n) {
    const left = deadline - nowMs();
    if (left <= 0) throw new Error('read-timeout');
    const chunk = await reader.read();
    if (chunk.done) throw new Error('read-eof');
    chunks.push(chunk.value);
    got += chunk.value.length;
  }
  return concatBytes(chunks).subarray(0, n);
}

let trojanHashCache = '';

async function handleSubscription(request, env, ctx, cfg) {
  const url = new URL(request.url);
  const host = url.hostname;
  const ua = (request.headers.get('user-agent') || '').toLowerCase();

  const nodes = await buildNodeList(env, ctx, cfg);
  const uuid = cfg.uuid;
  const wsPath = cfg.wsPath;
  const trojanEnabled = cfg.et;
  const trojanPassword = cfg.trojanPassword || uuid;

  
  if (!isValidTargetHost(host)) return new Response('bad-host', { status: 400 });

  const format =
    url.searchParams.get('format') ||
    (ua.includes('clash') || ua.includes('mihomo') || ua.includes('verge') || ua.includes('stash') || ua.includes('karing') || ua.includes('surge') || ua.includes('loon') || ua.includes('quantumult')
      ? 'clash'
      : ua.includes('sing-box') || ua.includes('singbox')
      ? 'singbox'
      : ua.includes('v2ray') || ua.includes('shadowrocket') || ua.includes('nekobox') || ua.includes('nekoray') || ua.includes('v2rayng')
      ? 'base64'
      : 'plain');

  const query = url.searchParams.get('target'); 

  let body, contentType;
  switch (format) {
    case 'clash':
      body = buildClashYaml(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword);
      contentType = 'text/yaml; charset=utf-8';
      break;
    case 'singbox':
      body = buildSingBoxJson(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword);
      contentType = 'application/json; charset=utf-8';
      break;
    case 'base64':
      
      body = btoa(unescape(encodeURIComponent(buildPlainLinks(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword))));
      contentType = 'text/plain; charset=utf-8';
      break;
    case 'plain':
    default:
      body = buildPlainLinks(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword);
      contentType = 'text/plain; charset=utf-8';
      break;
  }

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Profile-Update-Interval': '720',
    },
  });
}

async function buildNodeList(env, ctx, cfg) {
  const out = [];
  const seen = new Set();
  const add = (line) => {
    const n = parsePreferred(line);
    if (!n) return;
    const key = `${n.host}:${n.port}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(n);
  };

  
  const kv = env.K || null;
  if (kv) {
    const saved = await kvRead(kv, KV_IPS, 10000);
    if (saved) {
      for (const line of String(saved).split(/[\n,，]/)) add(line.trim());
    }
  }
  
  if (cfg.yx) {
    for (const line of String(cfg.yx).split(/[\n,，]/)) add(line.trim());
  }
  
  if (cfg.yxURL) {
    const urls = String(cfg.yxURL).split(/[,\n]/).map((u) => u.trim()).filter(Boolean);
    const results = await Promise.allSettled(urls.map((u) => fetchRemoteList(u)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        for (const line of r.value.split('\n')) add(line.trim());
      }
    }
  }
  
  if (out.length === 0) {
    for (const line of BUILTIN_IPS) add(line);
  }
  
  return out.slice(0, 300);
}

async function fetchRemoteList(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const res = await fetch(u, { headers: { 'User-Agent': __D(15) }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 262144) return text.slice(0, 262144);
    return text;
  } catch { return null; }
}

function parsePreferred(line) {
  if (!line || line.length > 200) return null;
  const m = line.match(/^\[?([^\]:/]+)\]?(?::(\d+))?(?:#(.+))?$/);
  if (!m) return null;
  const host = m[1].trim();
  const port = m[2] ? parseInt(m[2], 10) : 443;
  const name = (m[3] || '').trim() || host;
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  if (!isValidTargetHost(host)) return null;
  return { host, port, name };
}

function linkVless(ip, port, host, wsPath, uuid) {
  const path = encodeURIComponent(wsPath + '?ed=2048');
  return `vless://${uuid}@${ip}:${port}?encryption=none&security=tls&sni=${encodeURIComponent(host)}&fp=chrome&type=ws&host=${encodeURIComponent(host)}&path=${path}#${encodeURIComponent(nameOf(ip))}`;
}
function linkTrojan(ip, port, host, wsPath, pass) {
  const path = encodeURIComponent(wsPath + '?ed=2048');
  return `trojan://${encodeURIComponent(pass)}@${ip}:${port}?security=tls&sni=${encodeURIComponent(host)}&fp=chrome&type=ws&host=${encodeURIComponent(host)}&path=${path}#${encodeURIComponent(nameOf(ip))}`;
}
function nameOf(ip) {
  return __D(16) + ip.replace(/[^0-9a-zA-Z.-]/g, '');
}

function buildPlainLinks(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword) {
  const lines = [];
  for (const n of nodes) {
    lines.push(linkVless(n.host, n.port, host, wsPath, uuid));
    if (trojanEnabled) lines.push(linkTrojan(n.host, n.port, host, wsPath, trojanPassword));
  }
  return lines.join('\n') + '\n';
}

function buildClashYaml(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword) {
  const prox = [];
  nodes.forEach((n, i) => {
    const name = `${n.name}-${String(i + 1).padStart(2, '0')}`;
    prox.push({
      name,
      type: 'vless',
      server: n.host,
      port: n.port,
      uuid,
      network: 'ws',
      tls: true,
      'servername': host,
      'ws-opts': { path: wsPath + '?ed=2048', headers: { Host: host } },
      udp: true,
    });
    if (trojanEnabled) {
      prox.push({
        name: name + '-Trojan',
        type: 'trojan',
        server: n.host,
        port: n.port,
        password: trojanPassword,
        network: 'ws',
        tls: true,
        'servername': host,
        'ws-opts': { path: wsPath + '?ed=2048', headers: { Host: host } },
        udp: true,
      });
    }
  });
  const names = prox.map((p) => `"${p.name}"`);
  const yaml = [
    'mixed-port: 7890',
    'allow-lan: false',
    'mode: rule',
    'log-level: warning',
    'ipv6: false',
    'proxies:',
    ...prox.map((p) => yamlProxy(p)),
    'proxy-groups:',
    '  - name: ' + __D(17),
    '    type: select',
    '    proxies:',
    ...names.map((n) => `      - ${n}`),
    '  - name: ' + __D(18),
    '    type: url-test',
    '    url: "http://www.gstatic.com/generate_204"',
    '    interval: 300',
    '    tolerance: 50',
    '    proxies:',
    ...names.map((n) => `      - ${n}`),
    'rules:',
    '  - "IP-CIDR,127.0.0.0/8,DIRECT"',
    '  - "IP-CIDR,10.0.0.0/8,DIRECT"',
    '  - "IP-CIDR,172.16.0.0/12,DIRECT"',
    '  - "IP-CIDR,192.168.0.0/16,DIRECT"',
    '  - "IP-CIDR6,::1/128,DIRECT"',
    '  - "IP-CIDR6,fc00::/7,DIRECT"',
    '  - "MATCH,' + __D(19),
    '',
  ].join('\n');
  return yaml;
}
function yamlProxy(p) {
  const lines = [
    `  - name: "${p.name}"`,
    `    type: ${p.type}`,
    `    server: ${p.server}`,
    `    port: ${p.port}`,
  ];
  if (p.type === 'vless') lines.push(`    uuid: ${p.uuid}`);
  if (p.type === 'trojan') lines.push(`    password: ${p.password}`);
  lines.push(`    udp: true`, `    tls: true`, `    servername: ${p.servername}`, `    network: ws`);
  lines.push(`    ws-opts:`);
  lines.push(`      path: "${p['ws-opts'].path}"`);
  lines.push(`      headers:`);
  lines.push(`        Host: ${p['ws-opts'].headers.Host}`);
  return lines.join('\n');
}

function buildSingBoxJson(nodes, host, wsPath, uuid, trojanEnabled, trojanPassword) {
  const outbounds = [];
  nodes.forEach((n, i) => {
    outbounds.push({
      type: 'vless',
      tag: `${n.name}-${i + 1}`,
      server: n.host,
      server_port: n.port,
      uuid,
      tls: { enabled: true, server_name: host, utls: { enabled: true, fingerprint: 'chrome' } },
      transport: { type: 'ws', path: wsPath + '?ed=2048', headers: { Host: host } },
    });
    if (trojanEnabled) {
      outbounds.push({
        type: 'trojan',
        tag: `${n.name}-T-${i + 1}`,
        server: n.host,
        server_port: n.port,
        password: trojanPassword,
        tls: { enabled: true, server_name: host, utls: { enabled: true, fingerprint: 'chrome' } },
        transport: { type: 'ws', path: wsPath + '?ed=2048', headers: { Host: host } },
      });
    }
  });
  outbounds.push({ type: 'direct', tag: 'direct' });
  outbounds.push({ type: 'block', tag: 'block' });
  const selectorTags = outbounds.filter((o) => o.type !== 'direct' && o.type !== 'block').map((o) => o.tag);
  const json = {
    log: { level: 'warn' },
    dns: { servers: [{ address: 'https://223.5.5.5/dns-query', tag: 'doh' }] },
    outbounds: [
      {
        type: 'selector',
        tag: 'proxy',
        outbounds: selectorTags,
        default: selectorTags[0] || 'direct',
      },
      ...outbounds,
    ],
    route: {
      final: 'proxy',
      rules: [
        { ip_cidr: ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', 'fc00::/7'], outbound: 'direct' },
      ],
    },
  };
  return JSON.stringify(json, null, 2);
}

function cookieValue(request, name) {
  const h = request.headers.get('cookie') || '';
  for (const part of h.split(';')) {
    const kv = part.trim();
    if (kv.startsWith(name + '=')) return kv.slice(name.length + 1);
  }
  return null;
}

async function handlePanelLoginPage(request, env, ctx, cfg) {
  const pw = String(env.A ?? '');
  const cookie = cookieValue(request, 'cfone_session');
  const authed = await verifySession(pw, cookie);
  const kv = env.K || null;
  const kvCfg = await readPanelConfig(kv);
  return new Response(panelHtml(authed, cfg, kv ? true : false, kvCfg ? kvCfg.version : ''), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

async function handlePanelApi(request, env, ctx, cfg, rest) {
  const pw = String(env.A ?? '');
  if (!pw) return json({ error: 'unauthorized' }, 401);

  
  if (rest === 'login' && request.method === 'POST') {
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (loginThrottled(ip)) return json({ error: 'too-many' }, 429);
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const ok = await checkPassword({ panelPassword: pw }, String(body.password || ''));
    if (!ok) return json({ error: 'bad-password' }, 401);
    const sess = await issueSession(pw);
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        ...API_HEADERS,
        'Set-Cookie': `cfone_session=${sess.cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`,
      },
    });
  }
  if (rest === 'logout' && request.method === 'POST') {
    revokeSession(cookieValue(request, 'cfone_session'));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...API_HEADERS, 'Set-Cookie': 'cfone_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' },
    });
  }

  
  const cookie = cookieValue(request, 'cfone_session');
  const authed = await verifySession(pw, cookie);
  if (!authed) return json({ error: 'unauthorized' }, 401);

  const kv = env.K || null;

  
  if (rest === 'overview' && request.method === 'GET') {
    const host = new URL(request.url).hostname;
    const tok = await subToken(pw);
    const nodes = await buildNodeList(env, ctx, cfg);
    return json({
      ok: true,
      uuid: cfg.uuid,
      wsPath: cfg.wsPath,
      et: cfg.et,
      api: cfg.api,
      kvBound: !!kv,
      host,
      subUrl: `https://${host}/s/${tok}`,
      nodeCount: nodes.length,
      version: VERSION,
    });
  }

  
  if (rest === 'config' && request.method === 'GET') {
    return json({ ok: true, config: panelSafeConfig(cfg) });
  }
  
  if (rest === 'config' && request.method === 'PUT') {
    if (!kv) return json({ error: 'no-kv' }, 400);
    let body;
    try { body = await request.json(); } catch { body = {}; }
    const next = sanitizeConfig(body.config || {});
    const ver = String(nowMs());
    await kvWrite(kv, KV_CFG, JSON.stringify(next));
    await kvWrite(kv, KV_VER, ver);
    return json({ ok: true, version: ver });
  }

  
  if (rest === 'preferred-ips') {
    if (request.method === 'GET') {
      const saved = kv ? await kvRead(kv, KV_IPS, 10000) : null;
      return json({ ok: true, list: saved || '', builtin: BUILTIN_IPS.length });
    }
    if (request.method === 'PUT') {
      if (!kv) return json({ error: 'no-kv' }, 400);
      let body;
      try { body = await request.json(); } catch { body = {}; }
      let text = String(body.list || '').slice(0, 262144);
      
      const lines = text.split(/[\n,，]/).map((l) => l.trim()).filter(Boolean);
      const seen = new Set();
      const out = [];
      for (const l of lines) {
        const n = parsePreferred(l);
        if (!n) continue;
        const key = `${n.host}:${n.port}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(l);
      }
      if (out.length > 1000) out.length = 1000;
      await kvWrite(kv, KV_IPS, out.join('\n'));
      return json({ ok: true, count: out.length });
    }
    if (request.method === 'DELETE') {
      if (!kv) return json({ error: 'no-kv' }, 400);
      await kvWrite(kv, KV_IPS, '');
      return json({ ok: true });
    }
    return json({ error: 'method' }, 405);
  }

  
  if (rest === 'health' && request.method === 'GET') {
    return json({ ok: true, ts: nowMs(), uuid: cfg.uuid, wsPath: cfg.wsPath });
  }

  return json({ error: 'not-found' }, 404);
}

function panelSafeConfig(cfg) {
  return {
    uuid: cfg.uuid,
    trojanPassword: cfg.trojanPassword,
    et: cfg.et,
    wsPath: cfg.wsPath,
    proxyip: cfg.proxyip,
    s: cfg.s,
    qj: cfg.qj,
    yx: cfg.yx,
    yxURL: cfg.yxURL,
    maskHtml: cfg.maskHtml,
    maskUrl: cfg.maskUrl,
    api: cfg.api,
  };
}

function sanitizeConfig(input) {
  const out = {};
  const keys = ['uuid', 'trojanPassword', 'et', 'wsPath', 'proxyip', 's', 'qj', 'yx', 'yxURL', 'maskHtml', 'maskUrl', 'api'];
  for (const k of keys) {
    const v = input[k];
    if (v === undefined || v === null) continue;
    if (k === 'et' || k === 'api') out[k] = v === true || v === 'yes' || v === '1' || v === 'on';
    else out[k] = String(v).slice(0, 16384);
  }
  if (out.wsPath && !out.wsPath.startsWith('/')) out.wsPath = '/' + out.wsPath;
  if (out.uuid && !isUUID(out.uuid)) delete out.uuid;
  return out;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: API_HEADERS });
}

const MASK_DEFAULT = __D(20);

async function maskResponse(request, env, ctx, status, err) {
  const cfgLike = mergedConfig(envConfig(env), null);
  const maskHtml = cfgLike.maskHtml || '';
  const maskUrl = cfgLike.maskUrl || '';
  if (maskHtml.toLowerCase() === 'off' || maskHtml === '0' || maskHtml === 'false') {
    return new Response('Not Found', { status: 404 });
  }
  if (maskHtml) return new Response(maskHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status });
  if (maskUrl) {
    try {
      const res = await fetch(maskUrl, { headers: { 'User-Agent': __D(15) }, signal: AbortSignal.timeout(6000) });
      if (res.ok) {
        const body = await res.text();
        return new Response(body, { headers: { 'Content-Type': res.headers.get('content-type') || 'text/html; charset=utf-8' }, status });
      }
    } catch {  }
  }
  return new Response(MASK_DEFAULT, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status });
}

const PANEL_HTML = __D(21);

function panelHtml(authed, cfg, kvBound, version) {
  let html = PANEL_HTML;
  
  
  
  html = html
    .replace("${'__AUTHED__'}", authed ? 'true' : 'false')
    .replace("${'__CFG__'}", JSON.stringify(panelSafeConfig(cfg))
      .replace(/</g, '\\u003c')); 
  return html;
}
